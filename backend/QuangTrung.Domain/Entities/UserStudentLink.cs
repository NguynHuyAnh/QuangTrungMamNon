namespace QuangTrung.Domain.Entities;

public class UserStudentLink
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid StudentId { get; set; }
    public string Relationship { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public DateTime CreatedAt { get; set; }

    public Student? Student { get; set; }
}
