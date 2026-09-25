import type { SupabaseClient } from "@supabase/supabase-js";
import type { Meal, MealItem, MealType, Profile, Favorite, DayTotals } from "./types";
import { EMPTY_TOTALS, addTotals, itemTotals } from "./types";

export const PHOTO_BUCKET = "meal-photos";

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) {
    // Fallback defaults (a trigger creates the row on signup; this covers races)
    return {
      id: userId,
      calorie_target: 2200,
      protein_target_g: 150,
      carb_target_g: 250,
      fat_target_g: 70,
    };
  }
  return data as Profile;
}

export interface MealWithItems extends Meal {
  items: MealItem[];
}

export async function getDayMeals(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<MealWithItems[]> {
  const { data: meals } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at");

  const { data: items } = await supabase
    .from("meal_items")
    .select("*, meals!inner(user_id, date)")
    .eq("meals.user_id", userId)
    .eq("meals.date", date)
    .order("created_at");

  const byMeal = new Map<string, MealItem[]>();
  for (const it of (items ?? []) as (MealItem & { meals: unknown })[]) {
    const { meals: _omit, ...item } = it;
    const list = byMeal.get(item.meal_id) ?? [];
    list.push(item);
    byMeal.set(item.meal_id, list);
  }

  return ((meals ?? []) as Meal[]).map((m) => ({
    ...m,
    items: byMeal.get(m.id) ?? [],
  }));
}

export async function getOrCreateMeal(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  mealType: MealType
): Promise<string> {
  const { data } = await supabase
    .from("meals")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("meal_type", mealType)
    .maybeSingle();
  if (data) return (data as { id: string }).id;

  const { data: created, error } = await supabase
    .from("meals")
    .insert({ user_id: userId, date, meal_type: mealType })
    .select("id")
    .single();
  if (error || !created) throw new Error("Could not create meal");
  return (created as { id: string }).id;
}

export function dayTotals(meals: MealWithItems[]): DayTotals {
  return meals.reduce(
    (acc, m) => m.items.reduce((a, it) => addTotals(a, itemTotals(it)), acc),
    { ...EMPTY_TOTALS }
  );
}

/** Upload a photo to private per-user storage; returns the storage path. */
export async function uploadPhoto(
  supabase: SupabaseClient,
  userId: string,
  mealId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${mealId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

export async function deletePhoto(supabase: SupabaseClient, path: string) {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/** Batch signed URLs for private photo paths (1h expiry). */
export async function getSignedUrls(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(unique, 3600);
  if (error || !data) return map;
  for (const r of data) {
    if (r.signedUrl && r.path) map.set(r.path, r.signedUrl);
  }
  return map;
}

/** Distinct dates (newest first) that have at least one logged item. */
export async function getLoggedDates(
  supabase: SupabaseClient,
  userId: string,
  limit = 400
): Promise<string[]> {
  const { data } = await supabase
    .from("meals")
    .select("date, meal_items!inner(id)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit * 4);
  const dates = new Set<string>();
  for (const row of (data ?? []) as { date: string }[]) dates.add(row.date);
  return [...dates].sort().reverse().slice(0, limit);
}

export interface RangeDay {
  date: string;
  totals: DayTotals;
  itemCount: number;
}

/** Per-day totals for an inclusive date range. */
export async function getRangeDays(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string
): Promise<RangeDay[]> {
  const { data } = await supabase
    .from("meal_items")
    .select("calories, protein_g, carbs_g, fat_g, meals!inner(user_id, date)")
    .eq("meals.user_id", userId)
    .gte("meals.date", from)
    .lte("meals.date", to);

  const byDate = new Map<string, RangeDay>();
  type RangeRow = Pick<MealItem, "calories" | "protein_g" | "carbs_g" | "fat_g"> & {
    meals: { date: string };
  };
  for (const row of ((data ?? []) as unknown as RangeRow[])) {
    const d = row.meals.date;
    const cur = byDate.get(d) ?? { date: d, totals: { ...EMPTY_TOTALS }, itemCount: 0 };
    cur.totals = addTotals(cur.totals, itemTotals(row));
    cur.itemCount += 1;
    byDate.set(d, cur);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function getRecentFoods(
  supabase: SupabaseClient,
  userId: string,
  limit = 12
): Promise<MealItem[]> {
  const { data } = await supabase
    .from("meal_items")
    .select("*, meals!inner(user_id)")
    .eq("meals.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  const seen = new Set<string>();
  const out: MealItem[] = [];
  for (const row of (data ?? []) as (MealItem & { meals: unknown })[]) {
    const { meals: _omit, ...item } = row;
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export async function getFavorites(
  supabase: SupabaseClient,
  userId: string
): Promise<Favorite[]> {
  const { data } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Favorite[];
}

export interface PhotoEntry {
  path: string;
  date: string;
  mealType: MealType;
  itemName: string;
}

/** All photos for the user, newest first. */
export async function getAllPhotos(
  supabase: SupabaseClient,
  userId: string,
  limit = 200
): Promise<PhotoEntry[]> {
  const { data } = await supabase
    .from("meal_items")
    .select("photo_url, name, meals!inner(user_id, date, meal_type)")
    .eq("meals.user_id", userId)
    .not("photo_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  type PhotoRow = {
    photo_url: string;
    name: string;
    meals: { date: string; meal_type: MealType };
  };
  return ((data ?? []) as unknown as PhotoRow[]).map((r) => ({
    path: r.photo_url,
    date: r.meals.date,
    mealType: r.meals.meal_type,
    itemName: r.name,
  }));
}
