namespace QuangTrung.Domain.Entities;

/// <summary>
/// Một bản ghi theo dõi sức khỏe của học sinh tại một ngày. Không sửa trực tiếp <see cref="Student"/>
/// để giữ lịch sử. Không thay thế hồ sơ y tế chuyên môn.
/// </summary>
public class HealthReport
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public DateOnly ReportDate { get; set; }
    /// <summary>Chiều cao (cm).</summary>
    public decimal? Height { get; set; }
    /// <summary>Cân nặng (kg).</summary>
    public decimal? Weight { get; set; }
    /// <summary>Nhiệt độ cơ thể (°C).</summary>
    public decimal? Temperature { get; set; }
    /// <summary>Nhịp tim (lần/phút).</summary>
    public int? HeartRate { get; set; }
    /// <summary>Huyết áp, ví dụ "100/70".</summary>
    public string? BloodPressure { get; set; }
    public string? Symptoms { get; set; }
    public string? Diagnosis { get; set; }
    public string? Medication { get; set; }
    public string? DoctorNote { get; set; }
    /// <summary>Đã thông báo phụ huynh hay chưa (giáo viên/y tế tự đặt khi đã liên hệ).</summary>
    public bool ParentNotified { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public Student? Student { get; set; }
}
