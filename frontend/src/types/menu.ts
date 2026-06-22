export type DailyMenuItem = {
  id: string;
  dishName: string;
  ingredients?: string;
  nutritionNote?: string;
  caloriesKcal?: number;
  displayOrder: number;
  containsAllergen: boolean;
  allergenNote?: string;
};

export type DailyMenu = {
  id: string;
  menuDate: string;          // "2026-06-13"
  classId?: string;           // null = toàn trường
  className?: string;         // null = "Toàn trường"
  schoolYearId: string;
  mealType: string;           // "Bữa sáng" | "Bữa trưa" | "Bữa chiều" | "Bữa xế"
  description?: string;
  items: DailyMenuItem[];
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
};

export type DailyMenuSummary = {    // Dùng trong list view
  id: string;
  menuDate: string;
  mealType: string;
  className?: string;
  dishCount: number;
  description?: string;
  createdByName: string;
};

export type UpsertDailyMenuBody = {
  menuDate: string;
  classId?: string;
  schoolYearId: string;
  mealType: string;
  description?: string;
  items: {
    dishName: string;
    ingredients?: string;
    nutritionNote?: string;
    caloriesKcal?: number;
    displayOrder: number;
    containsAllergen?: boolean;
    allergenNote?: string;
  }[];
};

