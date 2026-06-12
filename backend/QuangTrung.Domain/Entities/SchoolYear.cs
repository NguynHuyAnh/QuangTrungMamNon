namespace QuangTrung.Domain.Entities;

public class SchoolYear
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
