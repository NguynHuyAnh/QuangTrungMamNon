using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Persistence;
using System.Security.Claims;

namespace QuangTrung.Api.Controllers;

/// <summary>
/// Thực đơn hằng ngày. Đọc (Menu.Read) cho mọi tài khoản — phụ huynh chỉ thấy thực đơn lớp con
/// và thực đơn toàn trường. Ghi (Menu.Write): Giáo viên + BGH + SuperAdmin.
/// </summary>
[ApiController]
[Route("api/daily-menus")]
public sealed class DailyMenusController(ApplicationDbContext db) : ControllerBase
{
    public sealed record DailyMenuItemDto(
        Guid? DishId, string DishName, string? Ingredients, string? NutritionNote,
        int? CaloriesKcal, bool ContainsAllergen, string? AllergenNote, int DisplayOrder);

    public sealed record DailyMenuSummary(
        Guid Id, DateOnly MenuDate, MealType MealType, Guid? ClassId, string? ClassName,
        string? Description, int DishCount, string CreatedByName, DateTime CreatedAt);

    public sealed record DailyMenuDetail(
        Guid Id, DateOnly MenuDate, MealType MealType, Guid? ClassId, string? ClassName,
        Guid SchoolYearId, string? Description, string CreatedByName, DateTime CreatedAt,
        DateTime? UpdatedAt, IReadOnlyList<DailyMenuItemDto> Items);

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Danh sách classId của các con đang học (assignment chưa kết thúc) của phụ huynh hiện tại.</summary>
    private async Task<List<Guid>> GetParentClassIdsAsync(CancellationToken ct)
    {
        var childIds = await db.UserStudentLinks.AsNoTracking()
            .Where(x => x.UserId == CurrentUserId)
            .Select(x => x.StudentId)
            .ToListAsync(ct);
        return await db.StudentClassAssignments.AsNoTracking()
            .Where(a => childIds.Contains(a.StudentId) && a.ToDate == null)
            .Select(a => a.ClassId)
            .Distinct()
            .ToListAsync(ct);
    }

    /// <summary>Áp filter hiển thị theo role: phụ huynh chỉ thấy toàn trường + lớp con.</summary>
    private async Task<IQueryable<DailyMenu>> ApplyVisibilityAsync(IQueryable<DailyMenu> query, CancellationToken ct)
    {
        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var classIds = await GetParentClassIdsAsync(ct);
            query = query.Where(m => m.ClassId == null || (m.ClassId != null && classIds.Contains(m.ClassId.Value)));
        }
        return query;
    }

    [HttpGet]
    [Authorize(Policy = AppPolicies.MenuRead)]
    public async Task<ActionResult<PagedResult<DailyMenuSummary>>> GetList(
        [FromQuery] DateOnly? date,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] MealType? mealType,
        [FromQuery] Guid? classId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = await ApplyVisibilityAsync(db.DailyMenus.AsNoTracking(), ct);

        if (date is not null)
            query = query.Where(m => m.MenuDate == date);
        if (from is not null)
            query = query.Where(m => m.MenuDate >= from);
        if (to is not null)
            query = query.Where(m => m.MenuDate <= to);
        if (mealType is not null)
            query = query.Where(m => m.MealType == mealType);
        if (classId is not null)
            query = query.Where(m => m.ClassId == classId);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(m => m.MenuDate).ThenBy(m => m.MealType)
            .Skip(skip).Take(ps)
            .Select(m => new DailyMenuSummary(
                m.Id, m.MenuDate, m.MealType, m.ClassId,
                m.Class != null ? m.Class.Name : null,
                m.Description, m.Items.Count,
                db.Users.Where(u => u.Id == m.CreatedByUserId).Select(u => u.FullName).FirstOrDefault() ?? "",
                m.CreatedAt))
            .ToListAsync(ct);
        return Ok(new PagedResult<DailyMenuSummary> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    /// <summary>Thực đơn của ngày hôm nay (giờ Việt Nam) áp dụng cho người dùng hiện tại, kèm món.</summary>
    [HttpGet("today")]
    [Authorize(Policy = AppPolicies.MenuRead)]
    public async Task<ActionResult<IReadOnlyList<DailyMenuDetail>>> GetToday(CancellationToken ct)
    {
        var todayVn = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var query = await ApplyVisibilityAsync(db.DailyMenus.AsNoTracking().Where(m => m.MenuDate == todayVn), ct);
        var result = await ProjectDetailsAsync(query.OrderBy(m => m.MealType), ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.MenuRead)]
    public async Task<ActionResult<DailyMenuDetail>> GetById(Guid id, CancellationToken ct)
    {
        var query = await ApplyVisibilityAsync(db.DailyMenus.AsNoTracking().Where(m => m.Id == id), ct);
        var result = await ProjectDetailsAsync(query, ct);
        if (result.Count == 0)
            return NotFound();
        return Ok(result[0]);
    }

    private async Task<List<DailyMenuDetail>> ProjectDetailsAsync(IQueryable<DailyMenu> query, CancellationToken ct)
    {
        return await query
            .Select(m => new DailyMenuDetail(
                m.Id, m.MenuDate, m.MealType, m.ClassId,
                m.Class != null ? m.Class.Name : null,
                m.SchoolYearId, m.Description,
                db.Users.Where(u => u.Id == m.CreatedByUserId).Select(u => u.FullName).FirstOrDefault() ?? "",
                m.CreatedAt, m.UpdatedAt,
                m.Items.OrderBy(i => i.DisplayOrder)
                    .Select(i => new DailyMenuItemDto(
                        i.DishId, i.DishName, i.Ingredients, i.NutritionNote,
                        i.CaloriesKcal, i.ContainsAllergen, i.AllergenNote, i.DisplayOrder))
                    .ToList()))
            .ToListAsync(ct);
    }

    public sealed record UpsertDailyMenuDto(
        DateOnly MenuDate, MealType MealType, Guid? ClassId, Guid? SchoolYearId,
        string? Description, List<DailyMenuItemDto> Items);

    [HttpPost]
    [Authorize(Policy = AppPolicies.MenuWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertDailyMenuDto dto, CancellationToken ct)
    {
        var schoolYearId = await ResolveSchoolYearIdAsync(dto.SchoolYearId, ct);
        if (schoolYearId is null)
            return BadRequest("Chưa có năm học nào để gán thực đơn.");

        if (dto.ClassId is not null && !await db.Classes.AnyAsync(c => c.Id == dto.ClassId && !c.IsDeleted, ct))
            return BadRequest("Lớp không tồn tại.");

        var duplicate = await db.DailyMenus.AnyAsync(
            m => m.MenuDate == dto.MenuDate && m.MealType == dto.MealType && m.ClassId == dto.ClassId, ct);
        if (duplicate)
            return Conflict("Đã có thực đơn cho ngày, bữa và phạm vi này. Hãy sửa thực đơn hiện có.");

        var items = await BuildItemsAsync(dto.Items, ct);
        if (items is null)
            return BadRequest("Có món không hợp lệ (thiếu tên hoặc tham chiếu món không tồn tại).");

        var entity = new DailyMenu
        {
            Id = Guid.NewGuid(),
            MenuDate = dto.MenuDate,
            MealType = dto.MealType,
            ClassId = dto.ClassId,
            SchoolYearId = schoolYearId.Value,
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            CreatedByUserId = CurrentUserId,
            CreatedAt = DateTime.UtcNow,
            Items = items
        };
        db.DailyMenus.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/daily-menus/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.MenuWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertDailyMenuDto dto, CancellationToken ct)
    {
        var entity = await db.DailyMenus.Include(m => m.Items).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (entity is null)
            return NotFound();

        var schoolYearId = await ResolveSchoolYearIdAsync(dto.SchoolYearId ?? entity.SchoolYearId, ct);
        if (schoolYearId is null)
            return BadRequest("Chưa có năm học nào để gán thực đơn.");

        if (dto.ClassId is not null && !await db.Classes.AnyAsync(c => c.Id == dto.ClassId && !c.IsDeleted, ct))
            return BadRequest("Lớp không tồn tại.");

        var duplicate = await db.DailyMenus.AnyAsync(
            m => m.Id != id && m.MenuDate == dto.MenuDate && m.MealType == dto.MealType && m.ClassId == dto.ClassId, ct);
        if (duplicate)
            return Conflict("Đã có thực đơn khác cho ngày, bữa và phạm vi này.");

        var items = await BuildItemsAsync(dto.Items, ct);
        if (items is null)
            return BadRequest("Có món không hợp lệ (thiếu tên hoặc tham chiếu món không tồn tại).");

        entity.MenuDate = dto.MenuDate;
        entity.MealType = dto.MealType;
        entity.ClassId = dto.ClassId;
        entity.SchoolYearId = schoolYearId.Value;
        entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        entity.UpdatedAt = DateTime.UtcNow;

        db.DailyMenuItems.RemoveRange(entity.Items);
        foreach (var it in items)
            it.DailyMenuId = entity.Id;
        await db.DailyMenuItems.AddRangeAsync(items, ct);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.MenuWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.DailyMenus.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (entity is null)
            return NotFound();
        db.DailyMenus.Remove(entity); // Items xóa theo cascade
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<Guid?> ResolveSchoolYearIdAsync(Guid? requested, CancellationToken ct)
    {
        if (requested is not null && await db.SchoolYears.AnyAsync(y => y.Id == requested && !y.IsDeleted, ct))
            return requested;

        var current = await db.SchoolYears.AsNoTracking()
            .Where(y => !y.IsDeleted)
            .OrderByDescending(y => y.IsCurrent)
            .ThenByDescending(y => y.StartDate)
            .Select(y => (Guid?)y.Id)
            .FirstOrDefaultAsync(ct);
        return current;
    }

    /// <summary>
    /// Dựng danh sách <see cref="DailyMenuItem"/>. Nếu món tham chiếu danh mục (DishId) thì lấy snapshot
    /// từ <see cref="Dish"/> để đảm bảo tính chính xác; món tự do (DishId null) cần có tên. Trả null nếu không hợp lệ.
    /// </summary>
    private async Task<List<DailyMenuItem>?> BuildItemsAsync(List<DailyMenuItemDto>? input, CancellationToken ct)
    {
        var source = input ?? new List<DailyMenuItemDto>();
        var dishIds = source.Where(i => i.DishId is not null).Select(i => i.DishId!.Value).Distinct().ToList();
        var dishes = dishIds.Count == 0
            ? new Dictionary<Guid, Dish>()
            : await db.Dishes.AsNoTracking().Where(d => dishIds.Contains(d.Id) && !d.IsDeleted)
                .ToDictionaryAsync(d => d.Id, ct);

        var order = 0;
        var result = new List<DailyMenuItem>();
        foreach (var i in source)
        {
            var item = new DailyMenuItem { Id = Guid.NewGuid(), DisplayOrder = order++ };
            if (i.DishId is not null)
            {
                if (!dishes.TryGetValue(i.DishId.Value, out var dish))
                    return null;
                item.DishId = dish.Id;
                item.DishName = dish.Name;
                item.Ingredients = dish.Ingredients;
                item.NutritionNote = dish.NutritionNote;
                item.CaloriesKcal = dish.CaloriesKcal;
                item.ContainsAllergen = dish.ContainsAllergen;
                item.AllergenNote = dish.AllergenNote;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(i.DishName))
                    return null;
                item.DishId = null;
                item.DishName = i.DishName.Trim();
                item.Ingredients = string.IsNullOrWhiteSpace(i.Ingredients) ? null : i.Ingredients.Trim();
                item.NutritionNote = string.IsNullOrWhiteSpace(i.NutritionNote) ? null : i.NutritionNote.Trim();
                item.CaloriesKcal = i.CaloriesKcal;
                item.ContainsAllergen = i.ContainsAllergen;
                item.AllergenNote = string.IsNullOrWhiteSpace(i.AllergenNote) ? null : i.AllergenNote.Trim();
            }
            result.Add(item);
        }
        return result;
    }
}
