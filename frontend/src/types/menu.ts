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

// Mock data //
// Thực đơn hôm nay (2026-06-13) — dùng chung cho ParentMenuPage và TeacherMenuPage
export const mockTodayMenus: DailyMenu[] = [
  {
    id: "menu-001",
    menuDate: "2026-06-13",
    classId: undefined,     // Toàn trường
    className: undefined,
    schoolYearId: "sy-2526",
    mealType: "Bữa sáng",
    description: "Bữa sáng dinh dưỡng, dễ tiêu hóa.",
    items: [
      {
        id: "mi-001", dishName: "Cháo thịt bằm rau củ",
        ingredients: "Gạo tẻ, thịt heo xay, cà rốt, đậu hà lan",
        nutritionNote: "Giàu tinh bột và đạm",
        caloriesKcal: 180, displayOrder: 1,
        containsAllergen: false
      },
      {
        id: "mi-002", dishName: "Sữa tươi tiệt trùng",
        ingredients: "Sữa bò nguyên chất",
        nutritionNote: "Giàu canxi",
        caloriesKcal: 120, displayOrder: 2,
        containsAllergen: true, allergenNote: "Chứa sữa (lactose)"
      },
    ],
    createdByName: "Hiệu trưởng Phạm Thị Bích",
    createdAt: "2026-06-12T16:00:00Z",
  },
  {
    id: "menu-002",
    menuDate: "2026-06-13",
    classId: undefined,
    className: undefined,
    schoolYearId: "sy-2526",
    mealType: "Bữa trưa",
    description: "Thực đơn đầy đủ 4 nhóm chất.",
    items: [
      {
        id: "mi-003", dishName: "Cơm trắng",
        ingredients: "Gạo tẻ dẻo",
        caloriesKcal: 200, displayOrder: 1,
        containsAllergen: false
      },
      {
        id: "mi-004", dishName: "Thịt kho trứng cút",
        ingredients: "Thịt ba chỉ heo, trứng cút, nước dừa, nước mắm",
        nutritionNote: "Giàu đạm và chất béo",
        caloriesKcal: 220, displayOrder: 2,
        containsAllergen: false
      },
      {
        id: "mi-005", dishName: "Canh rau ngót nấu thịt",
        ingredients: "Rau ngót, thịt heo xay, hành tím",
        nutritionNote: "Giàu vitamin C và sắt",
        caloriesKcal: 80, displayOrder: 3,
        containsAllergen: false
      },
      {
        id: "mi-006", dishName: "Dưa hấu tráng miệng",
        ingredients: "Dưa hấu tươi",
        nutritionNote: "Thanh mát, bổ sung nước",
        caloriesKcal: 40, displayOrder: 4,
        containsAllergen: false
      },
    ],
    createdByName: "Hiệu trưởng Phạm Thị Bích",
    createdAt: "2026-06-12T16:00:00Z",
  },
  {
    id: "menu-003",
    menuDate: "2026-06-13",
    classId: undefined,
    className: undefined,
    schoolYearId: "sy-2526",
    mealType: "Bữa xế",
    description: "Bữa phụ chiều giúp trẻ duy trì năng lượng.",
    items: [
      {
        id: "mi-007", dishName: "Bánh mì phô mai",
        ingredients: "Bánh mì sandwich, phô mai lát, bơ nhạt",
        nutritionNote: "Bổ sung canxi và năng lượng nhanh",
        caloriesKcal: 150, displayOrder: 1,
        containsAllergen: true, allergenNote: "Chứa gluten, sữa"
      },
      {
        id: "mi-008", dishName: "Nước cam ép tươi",
        ingredients: "Cam sành tươi nguyên chất",
        nutritionNote: "Giàu vitamin C",
        caloriesKcal: 60, displayOrder: 2,
        containsAllergen: false
      },
    ],
    createdByName: "Nguyễn Thị Lan",
    createdAt: "2026-06-12T17:30:00Z",
  },
];

// Danh sách thực đơn cả tuần (dùng cho Teacher list view)
export const mockMenuList: DailyMenuSummary[] = [
  { id: "menu-001", menuDate: "2026-06-13", mealType: "Bữa sáng",
    dishCount: 2, description: "Bữa sáng dinh dưỡng, dễ tiêu hóa.",
    createdByName: "Phạm Thị Bích" },
  { id: "menu-002", menuDate: "2026-06-13", mealType: "Bữa trưa",
    dishCount: 4, description: "Thực đơn đầy đủ 4 nhóm chất.",
    createdByName: "Phạm Thị Bích" },
  { id: "menu-003", menuDate: "2026-06-13", mealType: "Bữa xế",
    dishCount: 2, description: "Bữa phụ chiều.",
    createdByName: "Nguyễn Thị Lan" },
  { id: "menu-004", menuDate: "2026-06-14", mealType: "Bữa sáng",
    dishCount: 2, description: "Bún bò Huế nhẹ cho bé.",
    createdByName: "Phạm Thị Bích" },
  { id: "menu-005", menuDate: "2026-06-14", mealType: "Bữa trưa",
    dishCount: 4, description: "Cá kho tộ + canh bí xanh.",
    createdByName: "Phạm Thị Bích" },
  { id: "menu-006", menuDate: "2026-06-16", mealType: "Bữa sáng",
    dishCount: 2, className: "Lá A",
    description: "Thực đơn riêng lớp Lá A (bé dị ứng tôm).",
    createdByName: "Nguyễn Thị Lan" },
];