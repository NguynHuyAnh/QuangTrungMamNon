using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

/// <summary>Danh mục "loại thức ăn". Đọc: BGH/GV/SuperAdmin. Ghi: BGH/SuperAdmin.</summary>
[ApiController]
[Route("api/dishes")]
public sealed class DishesController(ApplicationDbContext db) : ControllerBase
{
    public sealed record DishRow(
        Guid Id, string Name, string? Ingredients, string? NutritionNote, int? CaloriesKcal,
        bool ContainsAllergen, string? AllergenNote, bool IsActive);

    [HttpGet]
    [Authorize(Policy = AppPolicies.DishesRead)]
    public async Task<ActionResult<PagedResult<DishRow>>> GetList(
        [FromQuery] string? q,
        [FromQuery] bool? activeOnly,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.Dishes.AsNoTracking().Where(d => !d.IsDeleted);

        if (activeOnly == true)
            query = query.Where(d => d.IsActive);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(d => d.Name.Contains(term) || (d.Ingredients != null && d.Ingredients.Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(d => d.Name).Skip(skip).Take(ps)
            .Select(d => new DishRow(d.Id, d.Name, d.Ingredients, d.NutritionNote, d.CaloriesKcal, d.ContainsAllergen, d.AllergenNote, d.IsActive))
            .ToListAsync(ct);
        return Ok(new PagedResult<DishRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.DishesRead)]
    public async Task<ActionResult<DishRow>> GetById(Guid id, CancellationToken ct)
    {
        var d = await db.Dishes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (d is null)
            return NotFound();
        return Ok(new DishRow(d.Id, d.Name, d.Ingredients, d.NutritionNote, d.CaloriesKcal, d.ContainsAllergen, d.AllergenNote, d.IsActive));
    }

    public sealed record UpsertDishDto(
        string Name, string? Ingredients, string? NutritionNote, int? CaloriesKcal,
        bool ContainsAllergen, string? AllergenNote, bool IsActive);

    [HttpPost]
    [Authorize(Policy = AppPolicies.DishesWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertDishDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên món không được để trống.");

        var entity = new Dish
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Ingredients = string.IsNullOrWhiteSpace(dto.Ingredients) ? null : dto.Ingredients.Trim(),
            NutritionNote = string.IsNullOrWhiteSpace(dto.NutritionNote) ? null : dto.NutritionNote.Trim(),
            CaloriesKcal = dto.CaloriesKcal,
            ContainsAllergen = dto.ContainsAllergen,
            AllergenNote = string.IsNullOrWhiteSpace(dto.AllergenNote) ? null : dto.AllergenNote.Trim(),
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };
        db.Dishes.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/dishes/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.DishesWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertDishDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên món không được để trống.");

        var entity = await db.Dishes.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        entity.Name = dto.Name.Trim();
        entity.Ingredients = string.IsNullOrWhiteSpace(dto.Ingredients) ? null : dto.Ingredients.Trim();
        entity.NutritionNote = string.IsNullOrWhiteSpace(dto.NutritionNote) ? null : dto.NutritionNote.Trim();
        entity.CaloriesKcal = dto.CaloriesKcal;
        entity.ContainsAllergen = dto.ContainsAllergen;
        entity.AllergenNote = string.IsNullOrWhiteSpace(dto.AllergenNote) ? null : dto.AllergenNote.Trim();
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.DishesWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Dishes.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        // Soft-delete: giữ snapshot trong các thực đơn lịch sử đã tham chiếu món này.
        entity.IsDeleted = true;
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
