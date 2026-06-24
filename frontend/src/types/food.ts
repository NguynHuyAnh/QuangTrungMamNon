export interface Food {
    id: number;
    name: string;
    meal: string;
    mealTime: string;
    calories: number;
}

export interface DailyMenu {
    id: number;
    date: string;
    className: string;
    foods: Food[];
}