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

/// <summary>
/// Đơn nghỉ phép học sinh. Gửi: phụ huynh/GV/BGH. Duyệt: GV/BGH. Khi duyệt, hệ thống ghi/cập nhật
/// điểm danh "Nghỉ có phép" cho các ngày học (T2–T6) trong khoảng.
/// </summary>
[ApiController]
[Route("api/student-leave-requests")]
public sealed class StudentLeaveRequestsController(ApplicationDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public sealed record LeaveRow(
        Guid Id, Guid StudentId, string StudentName, DateOnly FromDate, DateOnly ToDate,
        string Reason, string? AttachmentUrl, LeaveStatus Status, string RequestedByName,
        string? ApprovedByName, DateTime? ApprovedAt, string? RejectReason, DateTime CreatedAt);

    private IQueryable<LeaveRow> Project(IQueryable<StudentLeaveRequest> q) =>
        q.Select(r => new LeaveRow(
            r.Id, r.StudentId,
            db.Students.Where(s => s.Id == r.StudentId).Select(s => s.FullName).FirstOrDefault() ?? "",
            r.FromDate, r.ToDate, r.Reason, r.AttachmentUrl, r.Status,
            db.Users.Where(u => u.Id == r.RequestedByUserId).Select(u => u.FullName).FirstOrDefault() ?? "",
            r.ApprovedByUserId != null ? db.Users.Where(u => u.Id == r.ApprovedByUserId).Select(u => u.FullName).FirstOrDefault() : null,
            r.ApprovedAt, r.RejectReason, r.CreatedAt));

    /// <summary>Lọc theo quyền: PH chỉ con mình; GV chỉ học sinh lớp chủ nhiệm; BGH/SuperAdmin xem tất cả.</summary>
    private async Task<IQueryable<StudentLeaveRequest>> ApplyVisibilityAsync(IQueryable<StudentLeaveRequest> query, CancellationToken ct)
    {
        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var childIds = await GetParentChildIdsAsync(ct);
            query = query.Where(r => childIds.Contains(r.StudentId));
        }
        else if (User.IsInRole(AppRoles.GiaoVien)
                 && !User.IsInRole(AppRoles.BanGiamHieu) && !User.IsInRole(AppRoles.SuperAdmin))
        {
            var studentIds = await GetTeacherStudentIdsAsync(ct);
            query = query.Where(r => studentIds.Contains(r.StudentId));
        }
        return query;
    }

    private async Task<List<Guid>> GetParentChildIdsAsync(CancellationToken ct) =>
        await db.UserStudentLinks.AsNoTracking()
            .Where(x => x.UserId == CurrentUserId).Select(x => x.StudentId).ToListAsync(ct);

    private async Task<List<Guid>> GetTeacherStudentIdsAsync(CancellationToken ct)
    {
        var classIds = await db.Classes.AsNoTracking()
            .Where(c => !c.IsDeleted && c.HomeroomTeacherId == CurrentUserId)
            .Select(c => c.Id).ToListAsync(ct);
        return await db.StudentClassAssignments.AsNoTracking()
            .Where(a => classIds.Contains(a.ClassId) && a.ToDate == null)
            .Select(a => a.StudentId).Distinct().ToListAsync(ct);
    }

    [HttpGet]
    [Authorize(Policy = AppPolicies.StudentLeaveRead)]
    public async Task<ActionResult<PagedResult<LeaveRow>>> GetList(
        [FromQuery] Guid? studentId,
        [FromQuery] LeaveStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = await ApplyVisibilityAsync(db.StudentLeaveRequests.AsNoTracking().Where(r => !r.IsDeleted), ct);

        if (studentId is not null)
            query = query.Where(r => r.StudentId == studentId);
        if (status is not null)
            query = query.Where(r => r.Status == status);

        var total = await query.CountAsync(ct);
        var items = await Project(query.OrderByDescending(r => r.CreatedAt).Skip(skip).Take(ps)).ToListAsync(ct);
        return Ok(new PagedResult<LeaveRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record CreateLeaveDto(Guid StudentId, DateOnly FromDate, DateOnly ToDate, string Reason, string? AttachmentUrl);

    [HttpPost]
    [Authorize(Policy = AppPolicies.StudentLeaveCreate)]
    public async Task<IActionResult> Create([FromBody] CreateLeaveDto dto, CancellationToken ct)
    {
        if (dto.ToDate < dto.FromDate)
            return BadRequest("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest("Lý do nghỉ không được để trống.");
        if (!await db.Students.AnyAsync(s => s.Id == dto.StudentId && !s.IsDeleted, ct))
            return BadRequest("Học sinh không tồn tại.");

        // Phụ huynh chỉ được gửi đơn cho con đã liên kết.
        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var childIds = await GetParentChildIdsAsync(ct);
            if (!childIds.Contains(dto.StudentId))
                return Forbid();
        }

        var entity = new StudentLeaveRequest
        {
            Id = Guid.NewGuid(),
            StudentId = dto.StudentId,
            FromDate = dto.FromDate,
            ToDate = dto.ToDate,
            Reason = dto.Reason.Trim(),
            AttachmentUrl = string.IsNullOrWhiteSpace(dto.AttachmentUrl) ? null : dto.AttachmentUrl.Trim(),
            Status = LeaveStatus.Pending,
            RequestedByUserId = CurrentUserId,
            CreatedAt = DateTime.UtcNow
        };
        db.StudentLeaveRequests.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/student-leave-requests/{entity.Id}", new { entity.Id });
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Policy = AppPolicies.StudentLeaveApprove)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var entity = await db.StudentLeaveRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (entity.Status != LeaveStatus.Pending)
            return BadRequest("Chỉ duyệt được đơn đang chờ.");

        entity.Status = LeaveStatus.Approved;
        entity.ApprovedByUserId = CurrentUserId;
        entity.ApprovedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await GenerateAttendanceAsync(entity, ct);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    public sealed record RejectLeaveDto(string? RejectReason);

    [HttpPost("{id:guid}/reject")]
    [Authorize(Policy = AppPolicies.StudentLeaveApprove)]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectLeaveDto dto, CancellationToken ct)
    {
        var entity = await db.StudentLeaveRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (entity.Status != LeaveStatus.Pending)
            return BadRequest("Chỉ từ chối được đơn đang chờ.");

        entity.Status = LeaveStatus.Rejected;
        entity.ApprovedByUserId = CurrentUserId;
        entity.ApprovedAt = DateTime.UtcNow;
        entity.RejectReason = string.IsNullOrWhiteSpace(dto.RejectReason) ? null : dto.RejectReason.Trim();
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Người gửi tự hủy khi đơn còn chờ; BGH/SuperAdmin cũng có thể hủy.</summary>
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = AppPolicies.StudentLeaveCreate)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var entity = await db.StudentLeaveRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (entity.Status != LeaveStatus.Pending)
            return BadRequest("Chỉ hủy được đơn đang chờ.");

        var isOwner = entity.RequestedByUserId == CurrentUserId;
        var isManager = User.IsInRole(AppRoles.BanGiamHieu) || User.IsInRole(AppRoles.SuperAdmin);
        if (!isOwner && !isManager)
            return Forbid();

        entity.Status = LeaveStatus.Cancelled;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>
    /// Ghi/cập nhật điểm danh "Nghỉ có phép" cho các ngày T2–T6 trong khoảng nghỉ. Lấy lớp từ phân
    /// công lớp đang hiệu lực; nếu học sinh chưa phân lớp thì bỏ qua (vẫn duyệt đơn). Upsert theo
    /// unique (ClassId, Date, StudentId).
    /// </summary>
    private async Task GenerateAttendanceAsync(StudentLeaveRequest leave, CancellationToken ct)
    {
        var classId = await db.StudentClassAssignments.AsNoTracking()
            .Where(a => a.StudentId == leave.StudentId && a.ToDate == null)
            .OrderByDescending(a => a.FromDate)
            .Select(a => (Guid?)a.ClassId)
            .FirstOrDefaultAsync(ct);
        if (classId is null)
            return;

        for (var d = leave.FromDate; d <= leave.ToDate; d = d.AddDays(1))
        {
            if (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                continue; // ngày học mặc định T2–T6; chỉnh tại đây nếu trường học T7

            var existing = await db.AttendanceRecords.FirstOrDefaultAsync(
                a => a.StudentId == leave.StudentId && a.ClassId == classId.Value && a.Date == d, ct);
            if (existing is not null)
            {
                existing.Status = AttendanceStatus.NghiCoPhep;
                existing.Reason = leave.Reason;
                existing.RecordedByUserId = CurrentUserId;
                existing.RecordedAt = DateTime.UtcNow;
            }
            else
            {
                db.AttendanceRecords.Add(new AttendanceRecord
                {
                    Id = Guid.NewGuid(),
                    StudentId = leave.StudentId,
                    ClassId = classId.Value,
                    Date = d,
                    Status = AttendanceStatus.NghiCoPhep,
                    Reason = leave.Reason,
                    RecordedByUserId = CurrentUserId,
                    RecordedAt = DateTime.UtcNow
                });
            }
        }
    }
}
