namespace QuangTrung.Domain.Entities;

public class StudentFeeAssignment
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid SchoolYearId { get; set; }
    public Guid FeeStructureId { get; set; }
    public int Month { get; set; }
    public decimal? AmountOverride { get; set; }
    public DateTime CreatedAt { get; set; }

    public Student? Student { get; set; }
    public SchoolYear? SchoolYear { get; set; }
    public FeeStructure? FeeStructure { get; set; }
}
