export interface Food {
    id: number;
    name: string;
    meal: string;
    mealTime: string;
    calories: number;
}

export const mockFoods: Food[] = [
    {
        id: 1,
        name: "Cháo sườn",
        meal: "Bữa sáng",
        mealTime: "07:30",
        calories: 250,
    },

    {
        id: 2,
        name: "Bánh mì sữa",
        meal: "Bữa sáng",
        mealTime: "07:45",
        calories: 220,
    },

    {
        id: 3,
        name: "Cơm thịt băm",
        meal: "Bữa trưa",
        mealTime: "11:00",
        calories: 520,
    },

    {
        id: 4,
        name: "Canh bí đỏ",
        meal: "Bữa trưa",
        mealTime: "11:00",
        calories: 180,
    },

    {
        id: 5,
        name: "Sữa tươi",
        meal: "Bữa phụ",
        mealTime: "14:30",
        calories: 180,
    },

    {
        id: 6,
        name: "Sữa chua",
        meal: "Bữa phụ",
        mealTime: "14:30",
        calories: 150,
    },
];

