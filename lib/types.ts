export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export interface Profile {
  id: string;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
}

export interface Meal {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
}

export interface MealItem {
  id: string;
  meal_id: string;
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  photo_url: string | null; // storage path inside the meal-photos bucket
  notes: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DayTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const EMPTY_TOTALS: DayTotals = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
};

export function addTotals(a: DayTotals, b: DayTotals): DayTotals {
  return {
    calories: a.calories + b.calories,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

export function itemTotals(item: Pick<MealItem, "calories" | "protein_g" | "carbs_g" | "fat_g">): DayTotals {
  return {
    calories: Number(item.calories) || 0,
    protein_g: Number(item.protein_g) || 0,
    carbs_g: Number(item.carbs_g) || 0,
    fat_g: Number(item.fat_g) || 0,
  };
}
