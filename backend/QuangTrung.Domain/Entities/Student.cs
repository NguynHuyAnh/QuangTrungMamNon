using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

public class Student
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public Gender Gender { get; set; }
    public DateOnly DateOfBirth { get; set; }
    public string? Ethnicity { get; set; }
    public string? Address { get; set; }
    public string? AvatarUrl { get; set; }
    /// <summary>Mã liên kết khi đăng ký phụ huynh (ví dụ QT-2025-001), duy nhất nếu có.</summary>
    public string? RegistrationCode { get; set; }
    public string? HealthNote { get; set; }
    public string? AllergyNote { get; set; }
    public StudentStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
