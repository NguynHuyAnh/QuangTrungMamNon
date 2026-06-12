using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/fee-structures")]
public sealed class FeeStructuresController(ApplicationDbContext db) : ControllerBase
{
    public sealed record FeeRow(Guid Id, Guid SchoolYearId, string Name, decimal Amount, FeeType FeeType);

    [HttpGet]
    [Authorize(Policy = AppPolicies.FeesRead)]
    public async Task<ActionResult<PagedResult<FeeRow>>> GetList(
        [FromQuery] Guid? schoolYearId,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.FeeStructures.AsNoTracking().Where(x => !x.IsDeleted);
        if (schoolYearId is not null)
            query = query.Where(x => x.SchoolYearId == schoolYearId);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(x => x.Name.Contains(q.Trim()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(x => x.Name).Skip(skip).Take(ps)
            .Select(x => new FeeRow(x.Id, x.SchoolYearId, x.Name, x.Amount, x.FeeType))
            .ToListAsync(ct);
        return Ok(new PagedResult<FeeRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeesRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var row = await db.FeeStructures.AsNoTracking()
            .Where(x => x.Id == id && !x.IsDeleted)
            .Select(x => new FeeRow(x.Id, x.SchoolYearId, x.Name, x.Amount, x.FeeType))
            .FirstOrDefaultAsync(ct);
        return row is null ? NotFound() : Ok(row);
    }

    public sealed record UpsertFeeDto(Guid SchoolYearId, string Name, decimal Amount, FeeType FeeType);

    [HttpPost]
    [Authorize(Policy = AppPolicies.FeesWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertFeeDto dto, CancellationToken ct)
    {
        var entity = new FeeStructure
        {
            Id = Guid.NewGuid(),
            SchoolYearId = dto.SchoolYearId,
            Name = dto.Name.Trim(),
            Amount = dto.Amount,
            FeeType = dto.FeeType,
            CreatedAt = DateTime.UtcNow
        };
        db.FeeStructures.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/fee-structures/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeesWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertFeeDto dto, CancellationToken ct)
    {
        var entity = await db.FeeStructures.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.SchoolYearId = dto.SchoolYearId;
        entity.Name = dto.Name.Trim();
        entity.Amount = dto.Amount;
        entity.FeeType = dto.FeeType;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeesWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.FeeStructures.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
