namespace QuangTrung.Domain.Entities;

public class Grade
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
