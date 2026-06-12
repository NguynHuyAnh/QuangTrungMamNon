using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    /// <summary>Khoản phí được gán (nếu thanh toán gắn với một dòng gán phí cụ thể).</summary>
    public Guid? StudentFeeAssignmentId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
    public PaymentMethod Method { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? Note { get; set; }
    public Guid RecordedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Student? Student { get; set; }
    public StudentFeeAssignment? StudentFeeAssignment { get; set; }
}
