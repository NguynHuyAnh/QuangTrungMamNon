using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/grades")]
public sealed class GradesController(ApplicationDbContext db) : ControllerBase
{
    public sealed record GradeRow(Guid Id, string Name, int SortOrder);

    [HttpGet]
    [Authorize(Policy = AppPolicies.CatalogRead)]
    public async Task<ActionResult<PagedResult<GradeRow>>> GetList(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.Grades.AsNoTracking().Where(x => !x.IsDeleted);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(x => x.Name.Contains(q.Trim()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(x => x.SortOrder).ThenBy(x => x.Name).Skip(skip).Take(ps)
            .Select(x => new GradeRow(x.Id, x.Name, x.SortOrder))
            .ToListAsync(ct);
        return Ok(new PagedResult<GradeRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.CatalogRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var row = await db.Grades.AsNoTracking()
            .Where(x => x.Id == id && !x.IsDeleted)
            .Select(x => new { x.Id, x.Name, x.SortOrder })
            .FirstOrDefaultAsync(ct);
        return row is null ? NotFound() : Ok(row);
    }

    public sealed record UpsertGradeDto(string Name, int SortOrder);

    [HttpPost]
    [Authorize(Policy = AppPolicies.CatalogWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertGradeDto dto, CancellationToken ct)
    {
        var entity = new Grade
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow
        };
        db.Grades.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/grades/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.CatalogWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertGradeDto dto, CancellationToken ct)
    {
        var entity = await db.Grades.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.Name = dto.Name.Trim();
        entity.SortOrder = dto.SortOrder;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.CatalogWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Grades.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
