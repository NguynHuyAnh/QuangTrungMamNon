using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

public class AttendanceRecord
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid ClassId { get; set; }
    public DateOnly Date { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Reason { get; set; }
    public Guid RecordedByUserId { get; set; }
    public DateTime RecordedAt { get; set; }

    public Student? Student { get; set; }
    public SchoolClass? Class { get; set; }
}
