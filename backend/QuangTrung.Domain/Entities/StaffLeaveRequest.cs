using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

/// <summary>
/// Đơn xin nghỉ phép của giáo viên / nhân viên (module nhân sự). Không liên quan điểm danh học sinh.
/// </summary>
public class StaffLeaveRequest
{
    public Guid Id { get; set; }
    /// <summary>Người xin nghỉ (tài khoản nhân viên).</summary>
    public Guid StaffUserId { get; set; }
    public StaffLeaveType LeaveType { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    /// <summary>Số ngày nghỉ (do người gửi khai/tính).</summary>
    public int TotalDays { get; set; }
    public string Reason { get; set; } = string.Empty;
    public LeaveStatus Status { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewNote { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
