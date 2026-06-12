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
[Route("api/attendance")]
public sealed class AttendanceController(ApplicationDbContext db) : ControllerBase
{
    public sealed record AttendanceRow(Guid Id, Guid StudentId, Guid ClassId, DateOnly Date, AttendanceStatus Status, string? Reason);

    [HttpGet("records")]
    [Authorize(Policy = AppPolicies.AttendanceRead)]
    public async Task<ActionResult<PagedResult<AttendanceRow>>> GetRecords(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] Guid? classId,
        [FromQuery] Guid? studentId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.AttendanceRecords.AsNoTracking();

        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var childIds = await db.UserStudentLinks.AsNoTracking()
                .Where(x => x.UserId == userId)
                .Select(x => x.StudentId)
                .ToListAsync(ct);
            query = query.Where(a => childIds.Contains(a.StudentId));
        }
        else if (User.IsInRole(AppRoles.GiaoVien))
        {
            var classIds = await db.Classes.AsNoTracking()
                .Where(c => !c.IsDeleted && c.HomeroomTeacherId == userId)
                .Select(c => c.Id)
                .ToListAsync(ct);
            query = query.Where(a => classIds.Contains(a.ClassId));
        }

        if (from is not null)
            query = query.Where(a => a.Date >= from);
        if (to is not null)
            query = query.Where(a => a.Date <= to);
        if (classId is not null)
            query = query.Where(a => a.ClassId == classId);
        if (studentId is not null)
            query = query.Where(a => a.StudentId == studentId);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.Date).ThenBy(a => a.StudentId)
            .Skip(skip).Take(ps)
            .Select(a => new AttendanceRow(a.Id, a.StudentId, a.ClassId, a.Date, a.Status, a.Reason))
            .ToListAsync(ct);
        return Ok(new PagedResult<AttendanceRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record CreateAttendanceDto(Guid StudentId, Guid ClassId, DateOnly Date, AttendanceStatus Status, string? Reason);

    [HttpPost("records")]
    [Authorize(Policy = AppPolicies.AttendanceWrite)]
    public async Task<IActionResult> CreateRecord([FromBody] CreateAttendanceDto dto, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var existing = await db.AttendanceRecords.FirstOrDefaultAsync(
            a => a.StudentId == dto.StudentId && a.ClassId == dto.ClassId && a.Date == dto.Date, ct);
        if (existing is not null)
        {
            existing.Status = dto.Status;
            existing.Reason = dto.Reason;
            existing.RecordedByUserId = userId;
            existing.RecordedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return Ok(new { existing.Id, updated = true });
        }

        var entity = new AttendanceRecord
        {
            Id = Guid.NewGuid(),
            StudentId = dto.StudentId,
            ClassId = dto.ClassId,
            Date = dto.Date,
            Status = dto.Status,
            Reason = dto.Reason,
            RecordedByUserId = userId,
            RecordedAt = DateTime.UtcNow
        };
        db.AttendanceRecords.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/attendance/records/{entity.Id}", new { entity.Id, updated = false });
    }

    [HttpPut("records/{id:guid}")]
    [Authorize(Policy = AppPolicies.AttendanceWrite)]
    public async Task<IActionResult> UpdateRecord(Guid id, [FromBody] CreateAttendanceDto dto, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var entity = await db.AttendanceRecords.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (entity is null)
            return NotFound();
        entity.StudentId = dto.StudentId;
        entity.ClassId = dto.ClassId;
        entity.Date = dto.Date;
        entity.Status = dto.Status;
        entity.Reason = dto.Reason;
        entity.RecordedByUserId = userId;
        entity.RecordedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    public sealed record BulkAttendanceItem(Guid StudentId, Guid ClassId, DateOnly Date, AttendanceStatus Status, string? Reason);

    [HttpPost("records/bulk")]
    [Authorize(Policy = AppPolicies.AttendanceWrite)]
    public async Task<IActionResult> Bulk([FromBody] List<BulkAttendanceItem> items, CancellationToken ct)
    {
        if (items.Count == 0)
            return BadRequest("Danh sách rỗng.");
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        foreach (var dto in items)
        {
            var existing = await db.AttendanceRecords.FirstOrDefaultAsync(
                a => a.StudentId == dto.StudentId && a.ClassId == dto.ClassId && a.Date == dto.Date, ct);
            if (existing is not null)
            {
                existing.Status = dto.Status;
                existing.Reason = dto.Reason;
                existing.RecordedByUserId = userId;
                existing.RecordedAt = DateTime.UtcNow;
            }
            else
            {
                db.AttendanceRecords.Add(new AttendanceRecord
                {
                    Id = Guid.NewGuid(),
                    StudentId = dto.StudentId,
                    ClassId = dto.ClassId,
                    Date = dto.Date,
                    Status = dto.Status,
                    Reason = dto.Reason,
                    RecordedByUserId = userId,
                    RecordedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { count = items.Count });
    }
}
