namespace QuangTrung.Domain.Entities;

/// <summary>
/// Danh mục "loại thức ăn" do Ban giám hiệu / SuperAdmin khai báo.
/// Giáo viên / BGH chọn lại các món này khi lập thực đơn hằng ngày (xem <see cref="DailyMenuItem"/>).
/// </summary>
public class Dish
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Ingredients { get; set; }
    public string? NutritionNote { get; set; }
    public int? CaloriesKcal { get; set; }
    public bool ContainsAllergen { get; set; }
    public string? AllergenNote { get; set; }
    /// <summary>Món còn dùng để lập thực đơn hay không (ẩn khỏi danh sách chọn nếu false).</summary>
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
