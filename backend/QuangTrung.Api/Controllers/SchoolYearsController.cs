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
[Route("api/school-years")]
public sealed class SchoolYearsController(ApplicationDbContext db) : ControllerBase
{
    public sealed record SchoolYearRow(Guid Id, string Name, DateOnly StartDate, DateOnly EndDate, bool IsCurrent);

    [HttpGet]
    [Authorize(Policy = AppPolicies.CatalogRead)]
    public async Task<ActionResult<PagedResult<SchoolYearRow>>> GetList(
        [FromQuery] string? q,
        [FromQuery] bool? isCurrent,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.SchoolYears.AsNoTracking().Where(x => !x.IsDeleted);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(x => x.Name.Contains(q.Trim()));
        if (isCurrent is true)
            query = query.Where(x => x.IsCurrent);
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(x => x.StartDate)
            .Skip(skip).Take(ps)
            .Select(x => new SchoolYearRow(x.Id, x.Name, x.StartDate, x.EndDate, x.IsCurrent))
            .ToListAsync(ct);
        return Ok(new PagedResult<SchoolYearRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.CatalogRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var row = await db.SchoolYears.AsNoTracking()
            .Where(x => x.Id == id && !x.IsDeleted)
            .Select(x => new { x.Id, x.Name, x.StartDate, x.EndDate, x.IsCurrent })
            .FirstOrDefaultAsync(ct);
        return row is null ? NotFound() : Ok(row);
    }

    public sealed record UpsertSchoolYearDto(string Name, DateOnly StartDate, DateOnly EndDate, bool IsCurrent);

    [HttpPost]
    [Authorize(Policy = AppPolicies.CatalogWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertSchoolYearDto dto, CancellationToken ct)
    {
        if (dto.IsCurrent)
            await db.SchoolYears.Where(x => x.IsCurrent && !x.IsDeleted).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsCurrent, false), ct);

        var entity = new SchoolYear
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            IsCurrent = dto.IsCurrent,
            CreatedAt = DateTime.UtcNow
        };
        db.SchoolYears.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/school-years/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.CatalogWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertSchoolYearDto dto, CancellationToken ct)
    {
        var entity = await db.SchoolYears.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        if (dto.IsCurrent)
            await db.SchoolYears.Where(x => x.Id != id && x.IsCurrent && !x.IsDeleted).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsCurrent, false), ct);

        entity.Name = dto.Name.Trim();
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.IsCurrent = dto.IsCurrent;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.CatalogWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.SchoolYears.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
