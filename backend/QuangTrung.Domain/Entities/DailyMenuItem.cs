namespace QuangTrung.Domain.Entities;

/// <summary>
/// Một món trong thực đơn. Tham chiếu tới <see cref="Dish"/> trong danh mục, đồng thời lưu
/// snapshot (tên/thành phần/calo...) để lịch sử bữa ăn không sai khi món gốc bị sửa hoặc ẩn.
/// </summary>
public class DailyMenuItem
{
    public Guid Id { get; set; }
    public Guid DailyMenuId { get; set; }
    /// <summary>null nếu món gốc trong danh mục đã bị xóa/không còn tham chiếu được.</summary>
    public Guid? DishId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string? Ingredients { get; set; }
    public string? NutritionNote { get; set; }
    public int? CaloriesKcal { get; set; }
    public bool ContainsAllergen { get; set; }
    public string? AllergenNote { get; set; }
    public int DisplayOrder { get; set; }

    public DailyMenu? DailyMenu { get; set; }
    public Dish? Dish { get; set; }
}
