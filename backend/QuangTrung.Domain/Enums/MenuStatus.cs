namespace QuangTrung.Domain.Enums;

/// <summary>Trạng thái duyệt của thực đơn hằng ngày. Phụ huynh chỉ thấy <see cref="Published"/>.</summary>
public enum MenuStatus
{
    Draft = 0,
    Approved = 1,
    Published = 2
}
