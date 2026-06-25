using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

/// <summary>Danh mục môn học chính khóa. Đọc: BGH/GV/SuperAdmin. Ghi: BGH/SuperAdmin.</summary>
[ApiController]
[Route("api/subjects")]
public sealed class SubjectsController(ApplicationDbContext db) : ControllerBase
{
    public sealed record SubjectRow(
        Guid Id, string Code, string Name, string? Description, string? ColorCode, bool IsActive);

    [HttpGet]
    [Authorize(Policy = AppPolicies.SubjectsRead)]
    public async Task<ActionResult<PagedResult<SubjectRow>>> GetList(
        [FromQuery] string? q,
        [FromQuery] bool? activeOnly,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.Subjects.AsNoTracking().Where(s => !s.IsDeleted);

        if (activeOnly == true)
            query = query.Where(s => s.IsActive);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(s => s.Name.Contains(term) || s.Code.Contains(term));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(s => s.Name).Skip(skip).Take(ps)
            .Select(s => new SubjectRow(s.Id, s.Code, s.Name, s.Description, s.ColorCode, s.IsActive))
            .ToListAsync(ct);
        return Ok(new PagedResult<SubjectRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.SubjectsRead)]
    public async Task<ActionResult<SubjectRow>> GetById(Guid id, CancellationToken ct)
    {
        var s = await db.Subjects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (s is null)
            return NotFound();
        return Ok(new SubjectRow(s.Id, s.Code, s.Name, s.Description, s.ColorCode, s.IsActive));
    }

    public sealed record UpsertSubjectDto(
        string Code, string Name, string? Description, string? ColorCode, bool IsActive);

    [HttpPost]
    [Authorize(Policy = AppPolicies.SubjectsWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertSubjectDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest("Mã môn không được để trống.");
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên môn không được để trống.");

        var code = dto.Code.Trim();
        if (await db.Subjects.AnyAsync(s => s.Code == code && !s.IsDeleted, ct))
            return Conflict("Mã môn đã tồn tại.");

        var entity = new Subject
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = dto.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            ColorCode = string.IsNullOrWhiteSpace(dto.ColorCode) ? null : dto.ColorCode.Trim(),
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };
        db.Subjects.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/subjects/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.SubjectsWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertSubjectDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest("Mã môn không được để trống.");
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên môn không được để trống.");

        var entity = await db.Subjects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        var code = dto.Code.Trim();
        if (await db.Subjects.AnyAsync(s => s.Id != id && s.Code == code && !s.IsDeleted, ct))
            return Conflict("Mã môn đã tồn tại.");

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        entity.ColorCode = string.IsNullOrWhiteSpace(dto.ColorCode) ? null : dto.ColorCode.Trim();
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.SubjectsWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Subjects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        if (await db.ClassTimetables.AnyAsync(t => t.SubjectId == id && !t.IsDeleted, ct))
            return Conflict("Môn đang được dùng trong thời khóa biểu, không thể xóa. Hãy tắt trạng thái thay vì xóa.");

        entity.IsDeleted = true;
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
