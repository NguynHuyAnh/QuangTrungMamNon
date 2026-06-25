using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

/// <summary>
/// Đơn xin nghỉ phép của học sinh (phụ huynh hoặc giáo viên gửi). Khi được duyệt, hệ thống
/// ghi/cập nhật <see cref="AttendanceRecord"/> trạng thái nghỉ có phép cho các ngày học trong khoảng.
/// </summary>
public class StudentLeaveRequest
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    /// <summary>Link ảnh đơn viết tay / giấy khám bệnh (nếu có).</summary>
    public string? AttachmentUrl { get; set; }
    public LeaveStatus Status { get; set; }
    /// <summary>Người gửi đơn (phụ huynh hoặc giáo viên).</summary>
    public Guid RequestedByUserId { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    /// <summary>Lý do từ chối — chỉ có khi <see cref="LeaveStatus.Rejected"/>.</summary>
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public Student? Student { get; set; }
}
