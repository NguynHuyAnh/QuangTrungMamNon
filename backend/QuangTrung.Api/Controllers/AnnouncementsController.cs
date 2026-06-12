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

[ApiController]
[Route("api/announcements")]
public sealed class AnnouncementsController(ApplicationDbContext db) : ControllerBase
{
    public sealed record AnnouncementRow(Guid Id, string Title, string Body, AnnouncementScope Scope, Guid? ClassId, AnnouncementStatus Status, DateTime? PublishedAt, Guid CreatedByUserId, DateTime CreatedAt);

    [HttpGet]
    [Authorize(Policy = AppPolicies.AnnouncementsRead)]
    public async Task<ActionResult<PagedResult<AnnouncementRow>>> GetList(
        [FromQuery] string? q,
        [FromQuery] AnnouncementStatus? status,
        [FromQuery] Guid? classId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.Announcements.AsNoTracking();

        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var childIds = await db.UserStudentLinks.AsNoTracking()
                .Where(x => x.UserId == userId)
                .Select(x => x.StudentId)
                .ToListAsync(ct);
            var classIds = await db.StudentClassAssignments.AsNoTracking()
                .Where(a => childIds.Contains(a.StudentId) && a.ToDate == null)
                .Select(a => a.ClassId)
                .Distinct()
                .ToListAsync(ct);
            query = query.Where(a =>
                a.Status == AnnouncementStatus.Published &&
                (a.Scope == AnnouncementScope.ToanTruong ||
                 (a.Scope == AnnouncementScope.TheoLop && a.ClassId != null && classIds.Contains(a.ClassId.Value))));
        }
        else
        {
            var canSeeAllDrafts = User.IsInRole(AppRoles.BanGiamHieu) || User.IsInRole(AppRoles.SuperAdmin);
            query = query.Where(a =>
                a.Status == AnnouncementStatus.Published ||
                (a.Status == AnnouncementStatus.Draft && (a.CreatedByUserId == userId || canSeeAllDrafts)));
        }

        if (status is not null)
            query = query.Where(a => a.Status == status);
        if (classId is not null)
            query = query.Where(a => a.Scope == AnnouncementScope.ToanTruong || a.ClassId == classId);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(a => a.Title.Contains(q.Trim()) || a.Body.Contains(q.Trim()));

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.CreatedAt).Skip(skip).Take(ps)
            .Select(a => new AnnouncementRow(a.Id, a.Title, a.Body, a.Scope, a.ClassId, a.Status, a.PublishedAt, a.CreatedByUserId, a.CreatedAt))
            .ToListAsync(ct);
        return Ok(new PagedResult<AnnouncementRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record CreateAnnouncementDraftDto(string Title, string Body, AnnouncementScope Scope, Guid? ClassId);

    [HttpPost("draft")]
    [Authorize(Policy = AppPolicies.AnnouncementsClassDraft)]
    public async Task<IActionResult> CreateDraft([FromBody] CreateAnnouncementDraftDto dto, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (dto.Scope == AnnouncementScope.TheoLop && dto.ClassId is null)
            return BadRequest("TheoLop cần ClassId.");

        var entity = new Announcement
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Body = dto.Body,
            Scope = dto.Scope,
            ClassId = dto.ClassId,
            Status = AnnouncementStatus.Draft,
            PublishedAt = null,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };
        db.Announcements.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/announcements/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}/publish")]
    [Authorize(Policy = AppPolicies.AnnouncementsPublishSchool)]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        var entity = await db.Announcements.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (entity is null)
            return NotFound();
        entity.Status = AnnouncementStatus.Published;
        entity.PublishedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    public sealed record UpdateAnnouncementDto(string Title, string Body, AnnouncementScope Scope, Guid? ClassId);

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.AnnouncementsClassDraft)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementDto dto, CancellationToken ct)
    {
        var entity = await db.Announcements.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (entity is null)
            return NotFound();
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isBghOrSuper = User.IsInRole(AppRoles.BanGiamHieu) || User.IsInRole(AppRoles.SuperAdmin);
        if (entity.Status == AnnouncementStatus.Published)
        {
            if (!isBghOrSuper)
                return Forbid();
        }
        else if (!isBghOrSuper && entity.CreatedByUserId != userId)
        {
            return Forbid();
        }

        if (dto.Scope == AnnouncementScope.TheoLop && dto.ClassId is null)
            return BadRequest("TheoLop cần ClassId.");

        entity.Title = dto.Title.Trim();
        entity.Body = dto.Body;
        entity.Scope = dto.Scope;
        entity.ClassId = dto.ClassId;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.AnnouncementsClassDraft)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Announcements.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (entity is null)
            return NotFound();
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isBghOrSuper = User.IsInRole(AppRoles.BanGiamHieu) || User.IsInRole(AppRoles.SuperAdmin);
        if (entity.Status == AnnouncementStatus.Published)
        {
            if (!isBghOrSuper)
                return Forbid();
        }
        else if (!isBghOrSuper && entity.CreatedByUserId != userId)
        {
            return Forbid();
        }

        db.Announcements.Remove(entity);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
