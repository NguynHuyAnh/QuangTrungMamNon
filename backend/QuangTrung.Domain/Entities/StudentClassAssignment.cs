namespace QuangTrung.Domain.Entities;

public class StudentClassAssignment
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid ClassId { get; set; }
    public Guid SchoolYearId { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public Student? Student { get; set; }
    public SchoolClass? Class { get; set; }
    public SchoolYear? SchoolYear { get; set; }
}
