// Kiểu dữ liệu cho chức năng Thực đơn (Menu) — khớp DTO ở
// backend/QuangTrung.Api/Controllers/DishesController.cs và DailyMenusController.cs.
// Enum MealType (QuangTrung.Domain.Enums.MealType) serialize thành số 0..3.

export const MEAL_TYPES = [
  { value: 0, label: 'Bữa sáng' },
  { value: 1, label: 'Bữa trưa' },
  { value: 2, label: 'Bữa xế' },
  { value: 3, label: 'Bữa chiều' },
] as const;

export function mealTypeLabel(value: number): string {
  return MEAL_TYPES.find((m) => m.value === value)?.label ?? `Bữa ${value}`;
}

// ----- Danh mục loại thức ăn (Dish) -----
export type DishRow = {
  id: string;
  name: string;
  ingredients?: string | null;
  nutritionNote?: string | null;
  caloriesKcal?: number | null;
  containsAllergen: boolean;
  allergenNote?: string | null;
  isActive: boolean;
};

export type UpsertDishBody = {
  name: string;
  ingredients?: string | null;
  nutritionNote?: string | null;
  caloriesKcal?: number | null;
  containsAllergen: boolean;
  allergenNote?: string | null;
  isActive: boolean;
};

// ----- Thực đơn hằng ngày (DailyMenu) -----
export type DailyMenuItem = {
  dishId?: string | null;
  dishName: string;
  ingredients?: string | null;
  nutritionNote?: string | null;
  caloriesKcal?: number | null;
  containsAllergen: boolean;
  allergenNote?: string | null;
  displayOrder: number;
};

export type DailyMenuSummary = {
  id: string;
  menuDate: string; // "2026-06-24"
  mealType: number;
  classId?: string | null;
  className?: string | null; // null = toàn trường
  description?: string | null;
  dishCount: number;
  createdByName: string;
  createdAt: string;
};

export type DailyMenuDetail = {
  id: string;
  menuDate: string;
  mealType: number;
  classId?: string | null;
  className?: string | null;
  schoolYearId: string;
  description?: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt?: string | null;
  items: DailyMenuItem[];
};

export type UpsertDailyMenuBody = {
  menuDate: string;
  mealType: number;
  classId?: string | null;
  schoolYearId?: string | null;
  description?: string | null;
  items: DailyMenuItem[];
};
