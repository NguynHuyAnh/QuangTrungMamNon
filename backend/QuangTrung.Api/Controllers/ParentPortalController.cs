using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;
using System.Security.Claims;

namespace QuangTrung.Api.Controllers;

/// <summary>API cổng phụ huynh (không cần Catalog / Students nội bộ).</summary>
[ApiController]
[Route("api/parent")]
[Authorize(Policy = AppPolicies.StudentsReadOwnChildren)]
public sealed class ParentPortalController(ApplicationDbContext db) : ControllerBase
{
    public sealed record SchoolYearBrief(Guid Id, string Name, bool IsCurrent);

    public sealed record LinkStudentBody(string Code);

    /// <summary>Năm học liên quan các con đã liên kết (từ gán phí hoặc phân công lớp hiện tại).</summary>
    [HttpGet("school-years")]
    public async Task<ActionResult<IReadOnlyList<SchoolYearBrief>>> GetSchoolYearsForMyChildren(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var childIds = await db.UserStudentLinks.AsNoTracking()
            .Where(l => l.UserId == userId)
            .Select(l => l.StudentId)
            .ToListAsync(ct);
        if (childIds.Count == 0)
            return Ok(Array.Empty<SchoolYearBrief>());

        var fromFees = await (
            from a in db.StudentFeeAssignments.AsNoTracking()
            join y in db.SchoolYears.AsNoTracking() on a.SchoolYearId equals y.Id
            where childIds.Contains(a.StudentId) && !y.IsDeleted
            select new { y.Id, y.Name, y.IsCurrent }).Distinct().ToListAsync(ct);

        var fromClasses = await (
            from a in db.StudentClassAssignments.AsNoTracking()
            where childIds.Contains(a.StudentId) && a.ToDate == null
            join c in db.Classes.AsNoTracking() on a.ClassId equals c.Id
            where !c.IsDeleted
            join y in db.SchoolYears.AsNoTracking() on c.SchoolYearId equals y.Id
            where !y.IsDeleted
            select new { y.Id, y.Name, y.IsCurrent }).Distinct().ToListAsync(ct);

        var merged = fromFees
            .Concat(fromClasses)
            .GroupBy(x => x.Id)
            .Select(g => g.First())
            .OrderByDescending(x => x.Name)
            .Select(x => new SchoolYearBrief(x.Id, x.Name, x.IsCurrent))
            .ToList();

        return Ok(merged);
    }

    /// <summary>Liên kết thêm học sinh cho tài khoản đã đăng nhập (cùng quy tắc mã như đăng ký).</summary>
    [HttpPost("link-student")]
    public async Task<IActionResult> LinkStudent([FromBody] LinkStudentBody body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Code))
            return BadRequest("Nhập mã học sinh / UUID / tiền tố 8 ký tự.");

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var sid = await StudentLinkCodeResolution.ResolveAsync(db, body.Code.Trim(), ct);
        if (sid is null)
            return BadRequest("Không tìm thấy học sinh, hoặc mã không đủ để xác định một em (trùng nhiều bản ghi).");

        var studentId = sid.Value;

        var linked = await db.UserStudentLinks.AsNoTracking()
            .AnyAsync(l => l.UserId == userId && l.StudentId == studentId, ct);
        if (linked)
            return Ok(new { alreadyLinked = true, studentId });

        db.UserStudentLinks.Add(new UserStudentLink
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StudentId = studentId,
            Relationship = "Phụ huynh",
            IsPrimary = false,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return Ok(new { linked = true, studentId });
    }
}
