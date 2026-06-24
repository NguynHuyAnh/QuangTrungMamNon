namespace QuangTrung.Domain.Entities;

public class Timetable
{
    public Guid Id { get; set; }

    public Guid ClassId { get; set; }

    public string Subject { get; set; } = string.Empty;

    public DayOfWeek DayOfWeek { get; set; }

    public int Period { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public Guid TeacherId { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }
}