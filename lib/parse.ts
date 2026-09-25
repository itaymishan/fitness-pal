import { findFood, type FoodEntry } from "./foods";
import { round1 } from "./utils";

export interface ParsedItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** human-readable explanation of what was assumed */
  assumption: string;
  /** true when no food matched — user must fill in numbers */
  unknown: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  half: 0.5, quarter: 0.25, couple: 2,
};

function parseLeadingQuantity(text: string): { qty: number; rest: string } | null {
  // "2x", "2", "1/2", "0.5", "two", "a", "an"
  const m = text.match(/^\s*(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(?:x\s+)?/i);
  if (m) {
    const raw = m[1].replace(/\s+/g, "");
    const qty = raw.includes("/") ? evalFraction(raw) : parseFloat(raw);
    return { qty, rest: text.slice(m[0].length) };
  }
  const w = text.match(/^\s*(a|an|[a-z]+)\b/i);
  if (w) {
    const word = w[1].toLowerCase();
    if (word === "a" || word === "an") return { qty: 1, rest: text.slice(w[0].length) };
    if (word in NUMBER_WORDS) return { qty: NUMBER_WORDS[word], rest: text.slice(w[0].length) };
  }
  return null;
}

function evalFraction(f: string): number {
  const [a, b] = f.split("/").map(Number);
  return b ? a / b : 0;
}

function parseGrams(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return m ? parseFloat(m[1]) : null;
}

function unitGrams(unit: string): number | null {
  const paren = unit.match(/\(\s*~?\s*(\d+)\s*g\s*\)/i);
  if (paren) return parseFloat(paren[1]);
  const bare = unit.match(/^\s*(\d+)\s*g\b/i);
  return bare ? parseFloat(bare[1]) : null;
}

function unitFraction(unit: string): number | null {
  const m = unit.match(/^\s*(\d+\s*\/\s*\d+)/);
  return m ? evalFraction(m[1].replace(/\s+/g, "")) : null;
}

/**
 * Turn free text like "two eggs and toast, 1/2 cup egg whites"
 * into estimated items. Everything is an estimate — the caller must
 * show assumptions and let the user review/edit before saving.
 */
export function parseMealText(input: string): ParsedItem[] {
  const phrases = input
    .split(/[,;\n]+|\s+(?:and|plus|with|&)\s+/i)
    .map((p) => p.replace(/^\s*(?:a|an)\s+slice\s+of\s+/i, "a slice ").trim())
    .filter(Boolean);

  return phrases.map((phrase) => parsePhrase(phrase));
}

function parsePhrase(phrase: string): ParsedItem {
  // A leading weight ("60g sourdough") is grams, not a count.
  const gramFirst = phrase.match(/^\s*(\d+(?:\.\d+)?)\s*g\b/i);
  let qty: number;
  let rest: string;
  let explicitGrams: number | null = null;
  if (gramFirst) {
    qty = 1;
    explicitGrams = parseFloat(gramFirst[1]);
    rest = phrase.slice(gramFirst[0].length).trim();
  } else {
    const q = parseLeadingQuantity(phrase);
    qty = q?.qty ?? 1;
    rest = (q ? q.rest : phrase).replace(/^\s*of\s+/i, "").trim();
  }

  const food: FoodEntry | null = findFood(rest);

  if (!food) {
    return {
      name: phrase.trim(),
      quantity: "",
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      assumption: "No match in the nutrition database — please enter values manually.",
      unknown: true,
    };
  }

  // Determine multiplier: explicit grams beat unit counts.
  const grams = explicitGrams ?? parseGrams(rest);
  const ug = unitGrams(food.unit);
  let multiplier: number;
  let qtyLabel: string;
  if (grams != null && ug != null) {
    multiplier = grams / ug;
    qtyLabel = `${grams}g`;
  } else {
    // If the spoken fraction equals the fraction in the unit ("1/2 cup egg whites"
    // where the unit IS "1/2 cup"), treat it as one unit, not half.
    const uf = unitFraction(food.unit);
    multiplier = uf != null && Math.abs(qty - uf) < 0.01 ? 1 : qty;
    qtyLabel = uf != null && Math.abs(qty - uf) < 0.01 ? food.unit : `${trimNum(qty)} × ${food.unit}`;
  }

  return {
    name: food.name,
    quantity: qtyLabel,
    calories: round1(food.calories * multiplier),
    protein_g: round1(food.protein_g * multiplier),
    carbs_g: round1(food.carbs_g * multiplier),
    fat_g: round1(food.fat_g * multiplier),
    assumption: `Estimated as ${qtyLabel} of ${food.name} (${food.unit}).`,
    unknown: false,
  };
}

function trimNum(n: number): string {
  return String(round1(n));
}
