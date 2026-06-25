namespace QuangTrung.Domain.Entities;

/// <summary>
/// Danh mục môn năng khiếu / ngoài giờ (bơi, múa, tiếng Anh tăng cường…). Tách riêng khỏi
/// <see cref="Subject"/> chính khóa. Có học phí và giới hạn sĩ số.
/// </summary>
public class ExternalSubject
{
    public Guid Id { get; set; }
    /// <summary>Mã môn ngoài, duy nhất (ví dụ SWIM, ENGLISH_CLUB).</summary>
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Giáo viên phụ trách — null nếu chưa gán hoặc giáo viên ngoài hệ thống.</summary>
    public Guid? TeacherId { get; set; }
    /// <summary>Học phí của môn.</summary>
    public decimal? FeeAmount { get; set; }
    /// <summary>Sĩ số tối đa cho phép đăng ký (null = không giới hạn).</summary>
    public int? MaxStudents { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
