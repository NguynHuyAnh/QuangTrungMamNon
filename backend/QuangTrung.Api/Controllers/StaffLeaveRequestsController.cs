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
/// Đơn nghỉ phép giáo viên/nhân viên (HR). Nhân viên gửi cho mình; BGH/SuperAdmin duyệt và xem tất cả.
/// Không liên quan điểm danh học sinh.
/// </summary>
[ApiController]
[Route("api/staff-leave-requests")]
public sealed class StaffLeaveRequestsController(ApplicationDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsManager => User.IsInRole(AppRoles.BanGiamHieu) || User.IsInRole(AppRoles.SuperAdmin);

    public sealed record StaffLeaveRow(
        Guid Id, Guid StaffUserId, string StaffName, StaffLeaveType LeaveType, DateOnly FromDate, DateOnly ToDate,
        int TotalDays, string Reason, LeaveStatus Status, string? ReviewedByName, string? ReviewNote,
        DateTime? ReviewedAt, DateTime CreatedAt);

    private IQueryable<StaffLeaveRow> Project(IQueryable<StaffLeaveRequest> q) =>
        q.Select(r => new StaffLeaveRow(
            r.Id, r.StaffUserId,
            db.Users.Where(u => u.Id == r.StaffUserId).Select(u => u.FullName).FirstOrDefault() ?? "",
            r.LeaveType, r.FromDate, r.ToDate, r.TotalDays, r.Reason, r.Status,
            r.ReviewedByUserId != null ? db.Users.Where(u => u.Id == r.ReviewedByUserId).Select(u => u.FullName).FirstOrDefault() : null,
            r.ReviewNote, r.ReviewedAt, r.CreatedAt));

    [HttpGet]
    [Authorize(Policy = AppPolicies.StaffLeaveRead)]
    public async Task<ActionResult<PagedResult<StaffLeaveRow>>> GetList(
        [FromQuery] LeaveStatus? status,
        [FromQuery] bool mine = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.StaffLeaveRequests.AsNoTracking().Where(r => !r.IsDeleted);

        // Không phải quản lý → chỉ thấy đơn của mình. Quản lý xem tất cả (hoặc lọc mine=true).
        if (!IsManager || mine)
            query = query.Where(r => r.StaffUserId == CurrentUserId);
        if (status is not null)
            query = query.Where(r => r.Status == status);

        var total = await query.CountAsync(ct);
        var items = await Project(query.OrderByDescending(r => r.CreatedAt).Skip(skip).Take(ps)).ToListAsync(ct);
        return Ok(new PagedResult<StaffLeaveRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record CreateStaffLeaveDto(StaffLeaveType LeaveType, DateOnly FromDate, DateOnly ToDate, int TotalDays, string Reason);

    [HttpPost]
    [Authorize(Policy = AppPolicies.StaffLeaveCreate)]
    public async Task<IActionResult> Create([FromBody] CreateStaffLeaveDto dto, CancellationToken ct)
    {
        if (dto.ToDate < dto.FromDate)
            return BadRequest("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest("Lý do nghỉ không được để trống.");
        if (dto.TotalDays <= 0)
            return BadRequest("Số ngày nghỉ phải lớn hơn 0.");

        var entity = new StaffLeaveRequest
        {
            Id = Guid.NewGuid(),
            StaffUserId = CurrentUserId,
            LeaveType = dto.LeaveType,
            FromDate = dto.FromDate,
            ToDate = dto.ToDate,
            TotalDays = dto.TotalDays,
            Reason = dto.Reason.Trim(),
            Status = LeaveStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        db.StaffLeaveRequests.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/staff-leave-requests/{entity.Id}", new { entity.Id });
    }

    public sealed record ReviewStaffLeaveDto(string? ReviewNote);

    [HttpPost("{id:guid}/approve")]
    [Authorize(Policy = AppPolicies.StaffLeaveApprove)]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ReviewStaffLeaveDto dto, CancellationToken ct) =>
        await ReviewAsync(id, LeaveStatus.Approved, dto.ReviewNote, ct);

    [HttpPost("{id:guid}/reject")]
    [Authorize(Policy = AppPolicies.StaffLeaveApprove)]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ReviewStaffLeaveDto dto, CancellationToken ct) =>
        await ReviewAsync(id, LeaveStatus.Rejected, dto.ReviewNote, ct);

    private async Task<IActionResult> ReviewAsync(Guid id, LeaveStatus newStatus, string? note, CancellationToken ct)
    {
        var entity = await db.StaffLeaveRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (entity.Status != LeaveStatus.Pending)
            return BadRequest("Chỉ xử lý được đơn đang chờ.");

        entity.Status = newStatus;
        entity.ReviewedByUserId = CurrentUserId;
        entity.ReviewNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        entity.ReviewedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Người gửi tự hủy khi đơn còn chờ.</summary>
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = AppPolicies.StaffLeaveCreate)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var entity = await db.StaffLeaveRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (entity.StaffUserId != CurrentUserId && !IsManager)
            return Forbid();
        if (entity.Status != LeaveStatus.Pending)
            return BadRequest("Chỉ hủy được đơn đang chờ.");

        entity.Status = LeaveStatus.Cancelled;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
