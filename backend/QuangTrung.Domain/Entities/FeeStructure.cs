using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

public class FeeStructure
{
    public Guid Id { get; set; }
    public Guid SchoolYearId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public FeeType FeeType { get; set; }
    public Guid? FeeCategoryId { get; set; }
    public FeeCategory? FeeCategory { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public SchoolYear? SchoolYear { get; set; }
}
