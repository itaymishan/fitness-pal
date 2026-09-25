/**
 * Built-in nutrition estimates used by the natural-language meal parser.
 * Values are approximate per the stated unit — the UI always labels
 * parsed results as estimates and lets the user edit before saving.
 */

export interface FoodEntry {
  /** canonical name */
  name: string;
  /** alternate words people might say */
  aliases: string[];
  /** unit description, e.g. "large egg", "slice (~30g)", "100g" */
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const FOODS: FoodEntry[] = [
  { name: "Egg", aliases: ["eggs"], unit: "1 large", calories: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 5 },
  { name: "Egg whites", aliases: ["egg white"], unit: "1/2 cup (~120g)", calories: 63, protein_g: 13, carbs_g: 0.9, fat_g: 0.2 },
  { name: "Sourdough bread", aliases: ["sourdough"], unit: "1 slice (~50g)", calories: 130, protein_g: 4.5, carbs_g: 26, fat_g: 1 },
  { name: "Toast (white bread)", aliases: ["toast", "bread slice", "white bread"], unit: "1 slice (~30g)", calories: 80, protein_g: 2.7, carbs_g: 15, fat_g: 1 },
  { name: "Whole wheat bread", aliases: ["wholemeal bread", "brown bread"], unit: "1 slice (~30g)", calories: 81, protein_g: 4, carbs_g: 14, fat_g: 1 },
  { name: "Butter", aliases: [], unit: "1 tbsp", calories: 102, protein_g: 0.1, carbs_g: 0, fat_g: 11.5 },
  { name: "Oatmeal", aliases: ["oats", "porridge"], unit: "1/2 cup dry (~40g)", calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3 },
  { name: "Greek yogurt (plain)", aliases: ["greek yoghurt", "yogurt", "yoghurt"], unit: "170g container", calories: 100, protein_g: 17, carbs_g: 6, fat_g: 0.7 },
  { name: "Milk (2%)", aliases: ["milk"], unit: "1 cup", calories: 122, protein_g: 8, carbs_g: 12, fat_g: 5 },
  { name: "Cheddar cheese", aliases: ["cheddar", "cheese"], unit: "30g slice", calories: 120, protein_g: 7, carbs_g: 0.4, fat_g: 10 },
  { name: "Cottage cheese", aliases: [], unit: "1/2 cup (~110g)", calories: 90, protein_g: 12, carbs_g: 5, fat_g: 2.5 },
  { name: "Banana", aliases: [], unit: "1 medium", calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4 },
  { name: "Apple", aliases: [], unit: "1 medium", calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3 },
  { name: "Orange", aliases: [], unit: "1 medium", calories: 62, protein_g: 1.2, carbs_g: 15, fat_g: 0.2 },
  { name: "Strawberries", aliases: ["strawberry"], unit: "1 cup (~150g)", calories: 49, protein_g: 1, carbs_g: 12, fat_g: 0.5 },
  { name: "Blueberries", aliases: ["blueberry"], unit: "1 cup (~150g)", calories: 84, protein_g: 1.1, carbs_g: 21, fat_g: 0.5 },
  { name: "Avocado", aliases: [], unit: "1/2 medium", calories: 120, protein_g: 1.5, carbs_g: 6, fat_g: 11 },
  { name: "Chicken breast (cooked)", aliases: ["chicken", "chicken breast"], unit: "100g", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
  { name: "Chicken thigh (cooked)", aliases: ["chicken thigh"], unit: "100g", calories: 209, protein_g: 26, carbs_g: 0, fat_g: 11 },
  { name: "Ground beef (lean, cooked)", aliases: ["ground beef", "mince", "beef"], unit: "100g", calories: 250, protein_g: 26, carbs_g: 0, fat_g: 15 },
  { name: "Salmon (cooked)", aliases: [], unit: "100g", calories: 206, protein_g: 22, carbs_g: 0, fat_g: 12 },
  { name: "Tuna (canned in water)", aliases: ["tuna"], unit: "1 can (~120g drained)", calories: 130, protein_g: 29, carbs_g: 0, fat_g: 1 },
  { name: "White rice (cooked)", aliases: ["rice"], unit: "1 cup (~150g)", calories: 195, protein_g: 3.6, carbs_g: 41, fat_g: 0.6 },
  { name: "Brown rice (cooked)", aliases: ["brown rice"], unit: "1 cup (~150g)", calories: 165, protein_g: 3.8, carbs_g: 34, fat_g: 1.3 },
  { name: "Pasta (cooked)", aliases: ["spaghetti", "noodles"], unit: "1 cup (~140g)", calories: 185, protein_g: 6.5, carbs_g: 37, fat_g: 1 },
  { name: "Quinoa (cooked)", aliases: [], unit: "1 cup (~170g)", calories: 205, protein_g: 8, carbs_g: 36, fat_g: 3.5 },
  { name: "Sweet potato", aliases: [], unit: "1 medium (~130g)", calories: 112, protein_g: 2, carbs_g: 26, fat_g: 0.1 },
  { name: "Potato", aliases: [], unit: "1 medium (~150g)", calories: 130, protein_g: 3, carbs_g: 30, fat_g: 0.2 },
  { name: "Broccoli", aliases: [], unit: "1 cup (~90g)", calories: 31, protein_g: 2.5, carbs_g: 6, fat_g: 0.3 },
  { name: "Spinach", aliases: [], unit: "2 cups raw (~60g)", calories: 14, protein_g: 1.7, carbs_g: 2, fat_g: 0.2 },
  { name: "Mixed salad", aliases: ["salad", "green salad"], unit: "2 cups", calories: 20, protein_g: 1.5, carbs_g: 4, fat_g: 0.2 },
  { name: "Olive oil", aliases: [], unit: "1 tbsp", calories: 119, protein_g: 0, carbs_g: 0, fat_g: 13.5 },
  { name: "Almonds", aliases: ["almond"], unit: "28g (~23 nuts)", calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14 },
  { name: "Peanut butter", aliases: [], unit: "2 tbsp (~32g)", calories: 188, protein_g: 8, carbs_g: 7, fat_g: 16 },
  { name: "Walnuts", aliases: ["walnut"], unit: "28g", calories: 185, protein_g: 4.3, carbs_g: 3.9, fat_g: 18.5 },
  { name: "Whey protein shake", aliases: ["protein shake", "protein powder", "whey"], unit: "1 scoop (~30g)", calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1 },
  { name: "Granola", aliases: [], unit: "1/2 cup (~60g)", calories: 270, protein_g: 6, carbs_g: 33, fat_g: 13 },
  { name: "Honey", aliases: [], unit: "1 tbsp", calories: 64, protein_g: 0.1, carbs_g: 17, fat_g: 0 },
  { name: "Pancakes", aliases: ["pancake"], unit: "2 medium", calories: 175, protein_g: 5, carbs_g: 33, fat_g: 3 },
  { name: "Bacon", aliases: [], unit: "2 strips", calories: 90, protein_g: 6, carbs_g: 0.2, fat_g: 7 },
  { name: "Sausage", aliases: [], unit: "1 link (~75g)", calories: 230, protein_g: 10, carbs_g: 2, fat_g: 20 },
  { name: "Ham", aliases: [], unit: "2 slices (~50g)", calories: 60, protein_g: 9, carbs_g: 1.5, fat_g: 2 },
  { name: "Turkey slices", aliases: ["turkey"], unit: "2 slices (~50g)", calories: 55, protein_g: 10, carbs_g: 1, fat_g: 1 },
  { name: "Tortilla wrap", aliases: ["tortilla", "wrap"], unit: "1 large (~60g)", calories: 180, protein_g: 5, carbs_g: 32, fat_g: 4 },
  { name: "Bagel", aliases: [], unit: "1 (~100g)", calories: 270, protein_g: 10, carbs_g: 53, fat_g: 1.5 },
  { name: "Croissant", aliases: [], unit: "1 medium (~60g)", calories: 230, protein_g: 5, carbs_g: 26, fat_g: 12 },
  { name: "Pizza slice", aliases: ["pizza"], unit: "1 slice cheese", calories: 285, protein_g: 12, carbs_g: 36, fat_g: 10 },
  { name: "Burger (beef)", aliases: ["burger", "hamburger", "cheeseburger"], unit: "1", calories: 550, protein_g: 30, carbs_g: 40, fat_g: 30 },
  { name: "French fries", aliases: ["fries", "chips"], unit: "medium serving (~115g)", calories: 365, protein_g: 4, carbs_g: 48, fat_g: 17 },
  { name: "Caesar salad", aliases: [], unit: "1 bowl", calories: 330, protein_g: 12, carbs_g: 12, fat_g: 28 },
  { name: "Sushi rolls", aliases: ["sushi"], unit: "8 pieces", calories: 300, protein_g: 12, carbs_g: 50, fat_g: 5 },
  { name: "Pad thai", aliases: [], unit: "1 plate", calories: 550, protein_g: 20, carbs_g: 65, fat_g: 22 },
  { name: "Lentil soup", aliases: ["lentils", "dal"], unit: "1 bowl (~250ml)", calories: 180, protein_g: 12, carbs_g: 30, fat_g: 1 },
  { name: "Chili con carne", aliases: ["chili"], unit: "1 bowl", calories: 350, protein_g: 25, carbs_g: 25, fat_g: 15 },
  { name: "Tofu (firm)", aliases: [], unit: "100g", calories: 76, protein_g: 8, carbs_g: 1.9, fat_g: 4.8 },
  { name: "Hummus", aliases: [], unit: "1/4 cup (~60g)", calories: 100, protein_g: 3, carbs_g: 6, fat_g: 7 },
  { name: "Dark chocolate", aliases: ["chocolate"], unit: "30g", calories: 170, protein_g: 2, carbs_g: 13, fat_g: 13 },
  { name: "Ice cream", aliases: [], unit: "1/2 cup", calories: 140, protein_g: 2.5, carbs_g: 17, fat_g: 7 },
  { name: "Orange juice", aliases: ["oj"], unit: "1 cup", calories: 112, protein_g: 1.7, carbs_g: 26, fat_g: 0.5 },
  { name: "Coffee (black)", aliases: ["coffee", "espresso"], unit: "1 cup", calories: 2, protein_g: 0.3, carbs_g: 0, fat_g: 0 },
  { name: "Latte", aliases: [], unit: "1 medium", calories: 120, protein_g: 8, carbs_g: 10, fat_g: 5 },
  { name: "Beer", aliases: [], unit: "1 bottle (330ml)", calories: 140, protein_g: 1, carbs_g: 12, fat_g: 0 },
  { name: "Red wine", aliases: ["wine"], unit: "1 glass (150ml)", calories: 125, protein_g: 0.1, carbs_g: 4, fat_g: 0 },
  { name: "Coca-Cola", aliases: ["coke", "soda", "pop"], unit: "1 can (355ml)", calories: 140, protein_g: 0, carbs_g: 39, fat_g: 0 },
];

/** Find a food by name or alias (case-insensitive, substring match). */
export function findFood(text: string): FoodEntry | null {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  // exact match first
  for (const f of FOODS) {
    if (f.name.toLowerCase() === q || f.aliases.some((a) => a.toLowerCase() === q)) {
      return f;
    }
  }
  // then substring: longest name match wins
  let best: FoodEntry | null = null;
  for (const f of FOODS) {
    const names = [f.name, ...f.aliases];
    for (const n of names) {
      const nl = n.toLowerCase();
      if (q.includes(nl) || nl.includes(q)) {
        if (!best || n.length > best.name.length) best = f;
      }
    }
  }
  return best;
}
