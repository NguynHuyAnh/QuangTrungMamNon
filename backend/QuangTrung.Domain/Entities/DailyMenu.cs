using QuangTrung.Domain.Enums;

namespace QuangTrung.Domain.Entities;

/// <summary>
/// Thực đơn cho một ngày + một bữa, áp dụng toàn trường (<see cref="ClassId"/> null) hoặc theo lớp.
/// </summary>
public class DailyMenu
{
    public Guid Id { get; set; }
    public DateOnly MenuDate { get; set; }
    public MealType MealType { get; set; }
    /// <summary>null = áp dụng toàn trường.</summary>
    public Guid? ClassId { get; set; }
    public Guid SchoolYearId { get; set; }
    public string? Description { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public SchoolClass? Class { get; set; }
    public SchoolYear? SchoolYear { get; set; }
    public ICollection<DailyMenuItem> Items { get; set; } = new List<DailyMenuItem>();
}
