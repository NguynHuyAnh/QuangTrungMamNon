using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/fee-categories")]
public sealed class FeeCategoriesController(ApplicationDbContext db) : ControllerBase
{
    public sealed record CategoryRow(Guid Id, string Name, string Description);

    [HttpGet]
    [Authorize(Policy = AppPolicies.FeesRead)]
    public async Task<ActionResult<List<CategoryRow>>> GetList(CancellationToken ct = default)
    {
        var items = await db.FeeCategories.AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => new CategoryRow(x.Id, x.Name, x.Description))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeesRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var row = await db.FeeCategories.AsNoTracking()
            .Where(x => x.Id == id && !x.IsDeleted)
            .Select(x => new CategoryRow(x.Id, x.Name, x.Description))
            .FirstOrDefaultAsync(ct);
        return row is null ? NotFound() : Ok(row);
    }

    public sealed record UpsertCategoryDto(string Name, string Description);

    [HttpPost]
    [Authorize(Policy = AppPolicies.FeeCategoriesWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertCategoryDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên loại phí không được để trống.");

        var entity = new FeeCategory
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };
        db.FeeCategories.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/fee-categories/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeeCategoriesWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertCategoryDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên loại phí không được để trống.");

        var entity = await db.FeeCategories.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        entity.Name = dto.Name.Trim();
        entity.Description = dto.Description?.Trim() ?? string.Empty;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeeCategoriesWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.FeeCategories.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        // Check if any FeeStructure is currently using this FeeCategory
        var isUsed = await db.FeeStructures.AnyAsync(x => x.FeeCategoryId == id && !x.IsDeleted, ct);
        if (isUsed)
            return BadRequest("Không thể xóa loại phí này vì đang có biểu phí sử dụng.");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
