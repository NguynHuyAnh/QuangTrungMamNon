namespace QuangTrung.Domain.Entities;

/// <summary>
/// Danh mục môn học chính khóa (dùng chung cho Thời khóa biểu). Không chứa thông tin lịch học.
/// Môn năng khiếu/ngoài giờ nằm ở <see cref="ExternalSubject"/> riêng.
/// </summary>
public class Subject
{
    public Guid Id { get; set; }
    /// <summary>Mã môn, duy nhất (ví dụ MUSIC, ENGLISH).</summary>
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Mã màu hiển thị trên giao diện Thời khóa biểu (ví dụ #FF8800).</summary>
    public string? ColorCode { get; set; }
    /// <summary>Môn còn dùng để xếp TKB hay không (ẩn khỏi danh sách chọn nếu false).</summary>
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
