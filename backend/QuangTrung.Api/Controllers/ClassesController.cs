using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;
using System.Security.Claims;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/classes")]
public sealed class ClassesController(ApplicationDbContext db) : ControllerBase
{
    public sealed record ClassRow(Guid Id, string Name, Guid SchoolYearId, Guid GradeId, int Capacity, Guid? HomeroomTeacherId);

    [HttpGet]
    [Authorize(Policy = AppPolicies.ClassesRead)]
    public async Task<ActionResult<PagedResult<ClassRow>>> GetList(
        [FromQuery] Guid? schoolYearId,
        [FromQuery] Guid? gradeId,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.Classes.AsNoTracking().Where(c => !c.IsDeleted);

        if (User.IsInRole(AppRoles.GiaoVien))
            query = query.Where(c => c.HomeroomTeacherId == userId);

        if (schoolYearId is not null)
            query = query.Where(c => c.SchoolYearId == schoolYearId);
        if (gradeId is not null)
            query = query.Where(c => c.GradeId == gradeId);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(c => c.Name.Contains(q.Trim()));

        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(c => c.Name).Skip(skip).Take(ps)
            .Select(c => new ClassRow(c.Id, c.Name, c.SchoolYearId, c.GradeId, c.Capacity, c.HomeroomTeacherId))
            .ToListAsync(ct);
        return Ok(new PagedResult<ClassRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.ClassesRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var q = db.Classes.AsNoTracking().Where(c => c.Id == id && !c.IsDeleted);
        if (User.IsInRole(AppRoles.GiaoVien))
            q = q.Where(c => c.HomeroomTeacherId == userId);
        var row = await q.Select(c => new { c.Id, c.Name, c.SchoolYearId, c.GradeId, c.Capacity, c.HomeroomTeacherId }).FirstOrDefaultAsync(ct);
        return row is null ? NotFound() : Ok(row);
    }

    public sealed record UpsertClassDto(Guid SchoolYearId, Guid GradeId, string Name, int Capacity, Guid? HomeroomTeacherId);

    [HttpPost]
    [Authorize(Policy = AppPolicies.ClassesWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertClassDto dto, CancellationToken ct)
    {
        var entity = new SchoolClass
        {
            Id = Guid.NewGuid(),
            SchoolYearId = dto.SchoolYearId,
            GradeId = dto.GradeId,
            Name = dto.Name.Trim(),
            Capacity = dto.Capacity,
            HomeroomTeacherId = dto.HomeroomTeacherId,
            CreatedAt = DateTime.UtcNow
        };
        db.Classes.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/classes/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.ClassesWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertClassDto dto, CancellationToken ct)
    {
        var entity = await db.Classes.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.SchoolYearId = dto.SchoolYearId;
        entity.GradeId = dto.GradeId;
        entity.Name = dto.Name.Trim();
        entity.Capacity = dto.Capacity;
        entity.HomeroomTeacherId = dto.HomeroomTeacherId;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.ClassesWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Classes.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
