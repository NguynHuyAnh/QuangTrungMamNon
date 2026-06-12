using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

public class SchoolClass
{
    public Guid Id { get; set; }
    public Guid SchoolYearId { get; set; }
    public Guid GradeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? HomeroomTeacherId { get; set; }
    public int Capacity { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public SchoolYear? SchoolYear { get; set; }
    public Grade? Grade { get; set; }
}
