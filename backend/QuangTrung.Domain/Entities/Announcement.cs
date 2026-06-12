using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

public class Announcement
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public AnnouncementScope Scope { get; set; }
    public Guid? ClassId { get; set; }
    public AnnouncementStatus Status { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public SchoolClass? Class { get; set; }
}
