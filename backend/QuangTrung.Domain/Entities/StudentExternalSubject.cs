using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

/// <summary>
/// Bảng nối học sinh ↔ môn năng khiếu (nhiều-nhiều). Lưu trạng thái đăng ký và cờ đóng học phí.
/// Một học sinh chỉ có tối đa một bản ghi <see cref="EnrollmentStatus.Active"/> cho mỗi môn.
/// </summary>
public class StudentExternalSubject
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid ExternalSubjectId { get; set; }
    public DateOnly EnrollDate { get; set; }
    /// <summary>Ngày ngừng học — chỉ có khi đã hủy/rút.</summary>
    public DateOnly? WithdrawDate { get; set; }
    public EnrollmentStatus Status { get; set; }
    public FeePaymentStatus PaymentStatus { get; set; }
    /// <summary>Thời điểm xác nhận thu tiền — chỉ có khi đã đóng.</summary>
    public DateTime? PaidAt { get; set; }
    /// <summary>Người thu tiền (kế toán) — chỉ có khi đã đóng.</summary>
    public Guid? CollectedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public Student? Student { get; set; }
    public ExternalSubject? ExternalSubject { get; set; }
}
