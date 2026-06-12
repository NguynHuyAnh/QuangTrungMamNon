using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

/// <summary>Đơn thanh toán ZaloPay (sandbox/production). Chỉ tạo <see cref="Payment"/> khi callback xác thực thành công.</summary>
public class ZaloPayOrder
{
    public Guid Id { get; set; }
    /// <summary>Mã giao dịch đối tác gửi ZaloPay (yyMMdd_ + unique).</summary>
    public string AppTransId { get; set; } = string.Empty;
    public Guid StudentId { get; set; }
    /// <summary>Nếu có: đơn thanh toán đúng một dòng gán phí (số tiền = phần còn nợ).</summary>
    public Guid? StudentFeeAssignmentId { get; set; }
    public long AmountVnd { get; set; }
    public string Description { get; set; } = string.Empty;
    public ZaloPayOrderStatus Status { get; set; }
    public string? ZpTransId { get; set; }
    public Guid? PaymentId { get; set; }
    public Guid RecordedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public Student? Student { get; set; }
    public StudentFeeAssignment? StudentFeeAssignment { get; set; }
    public Payment? Payment { get; set; }
}
