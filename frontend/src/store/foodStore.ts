export interface Food {
    id: number;
    name: string;
    meal: string;
    mealTime: string;
    calories: number;
}

export const foods: Food[] = [
    {
        id: 1,
        name: "Cháo sườn",
        meal: "Bữa sáng",
        mealTime: "07:30",
        calories: 250,
    },

    {
        id: 2,
        name: "Cơm thịt băm",
        meal: "Bữa trưa",
        mealTime: "11:00",
        calories: 520,
    },

    {
        id: 3,
        name: "Sữa tươi",
        meal: "Bữa phụ",
        mealTime: "14:30",
        calories: 180,
    },
];

