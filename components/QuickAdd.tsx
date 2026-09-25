"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRecentFoods, getFavorites, getOrCreateMeal } from "@/lib/data";
import type { Favorite, MealItem, MealType } from "@/lib/types";
import { addDaysISO } from "@/lib/utils";
import type { EntryDraft } from "./EntryModal";

interface Props {
  open: boolean;
  onClose: () => void;
  /** open the entry form prefilled */
  onPick: (draft: EntryDraft) => void;
  userId: string;
  date: string;
  mealType: MealType;
  onSaved: () => void;
}

export default function QuickAdd({ open, onClose, onPick, userId, date, mealType, onSaved }: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<"recent" | "favorites">("recent");
  const [recent, setRecent] = useState<MealItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [repeating, setRepeating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    getRecentFoods(supabase, userId).then(setRecent);
    getFavorites(supabase, userId).then(setFavorites);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function repeatYesterday() {
    setRepeating(true);
    setError(null);
    try {
      const yesterday = addDaysISO(date, -1);
      const { data: meals } = await supabase
        .from("meals")
        .select("id")
        .eq("user_id", userId)
        .eq("date", yesterday)
        .eq("meal_type", mealType)
        .maybeSingle();
      if (!meals) {
        setError("Nothing logged for this meal yesterday.");
        return;
      }
      const { data: items } = await supabase
        .from("meal_items")
        .select("*")
        .eq("meal_id", (meals as { id: string }).id);
      if (!items || items.length === 0) {
        setError("Nothing logged for this meal yesterday.");
        return;
      }
      const mealId = await getOrCreateMeal(supabase, userId, date, mealType);
      const rows = (items as MealItem[]).map((it) => ({
        meal_id: mealId,
        name: it.name,
        quantity: it.quantity,
        calories: it.calories,
        protein_g: it.protein_g,
        carbs_g: it.carbs_g,
        fat_g: it.fat_g,
        notes: it.notes,
        photo_url: null,
      }));
      const { error } = await supabase.from("meal_items").insert(rows);
      if (error) throw error;
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not repeat yesterday's meal.");
    } finally {
      setRepeating(false);
    }
  }

  const list = tab === "recent" ? recent : favorites;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">⚡ Quick add</h2>
          <button onClick={onClose} className="rounded-full bg-gray-100 px-3 py-1 text-sm">✕</button>
        </div>

        <button
          onClick={repeatYesterday}
          disabled={repeating}
          className="w-full rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-800 disabled:opacity-50"
        >
          {repeating ? "Copying…" : "↺ Log yesterday's meal again"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          {(["recent", "favorites"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize ${
                tab === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">
              {tab === "recent" ? "Nothing logged yet." : "No favorites yet — save one from the entry form."}
            </p>
          )}
          {list.map((f) => (
            <button
              key={f.id}
              onClick={() =>
                onPick({
                  name: f.name,
                  quantity: f.quantity,
                  calories: Number(f.calories),
                  protein_g: Number(f.protein_g),
                  carbs_g: Number(f.carbs_g),
                  fat_g: Number(f.fat_g),
                })
              }
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left"
            >
              <div>
                <div className="font-medium">{f.name}</div>
                {f.quantity && <div className="text-xs text-gray-500">{f.quantity}</div>}
              </div>
              <div className="text-sm text-gray-500">{Math.round(Number(f.calories))} kcal</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
