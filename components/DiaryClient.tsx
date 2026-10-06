"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getDayMeals,
  getProfile,
  getOrCreateMeal,
  getSignedUrls,
  getLoggedDates,
  type MealWithItems,
} from "@/lib/data";
import {
  MEAL_TYPES,
  MEAL_LABELS,
  type MealType,
  type Profile,
  type MealItem,
  type DayTotals,
  EMPTY_TOTALS,
  itemTotals,
  addTotals,
} from "@/lib/types";
import { todayISO, addDaysISO, prettyDate, calcStreak, round1 } from "@/lib/utils";
import TotalsHeader from "@/components/TotalsHeader";
import EntryModal, { type EntryDraft } from "@/components/EntryModal";
import SmartEntry from "@/components/SmartEntry";
import QuickAdd from "@/components/QuickAdd";
import ScanModal from "@/components/ScanModal";

const DEFAULT_PROFILE: Profile = {
  id: "",
  calorie_target: 2200,
  protein_target_g: 150,
  carb_target_g: 250,
  fat_target_g: 70,
};

export default function DiaryClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const date = searchParams.get("date") || todayISO();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // modal state
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryMealId, setEntryMealId] = useState("");
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);
  const [entryDefaults, setEntryDefaults] = useState<EntryDraft | null>(null);
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartMeal, setSmartMeal] = useState<MealType>("breakfast");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMeal, setQuickMeal] = useState<MealType>("breakfast");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMeal, setScanMeal] = useState<MealType>("breakfast");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [prof, dayMeals, loggedDates] = await Promise.all([
      getProfile(supabase, user.id),
      getDayMeals(supabase, user.id, date),
      getLoggedDates(supabase, user.id),
    ]);
    setProfile(prof);
    setMeals(dayMeals);
    setStreak(calcStreak(new Set(loggedDates)));
    const paths = dayMeals.flatMap((m) => m.items.map((i) => i.photo_url).filter(Boolean)) as string[];
    setPhotoUrls(await getSignedUrls(supabase, paths));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  function goDate(d: string) {
    router.push(`/diary?date=${d}`);
  }

  async function openAdd(mealType: MealType) {
    if (!userId) return;
    const mealId = await getOrCreateMeal(supabase, userId, date, mealType);
    setEntryMealId(mealId);
    setEditingItem(null);
    setEntryDefaults(null);
    setEntryOpen(true);
  }

  async function openEdit(item: MealItem) {
    setEntryMealId(item.meal_id);
    setEditingItem(item);
    setEntryDefaults(null);
    setEntryOpen(true);
  }

  async function deleteItem(item: MealItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await supabase.from("meal_items").delete().eq("id", item.id);
    load();
  }

  const totals: DayTotals = meals.reduce(
    (acc, m) => m.items.reduce((a, it) => addTotals(a, itemTotals(it)), acc),
    { ...EMPTY_TOTALS }
  );

  const mealsByType = new Map<MealType, MealWithItems>();
  for (const m of meals) mealsByType.set(m.meal_type, m);

  return (
    <main className="px-4 pt-4">
      {/* date nav */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => goDate(addDaysISO(date, -1))}
          aria-label="Previous day"
          className="min-h-[44px] rounded-full bg-white px-5 py-2.5 text-sm font-medium shadow-sm"
        >
          ←
        </button>
        <div className="text-center">
          <div className="font-bold">{prettyDate(date)}</div>
          {date === todayISO() && (
            <div className="text-xs text-gray-500">
              🔥 {streak} day{streak === 1 ? "" : "s"} streak
            </div>
          )}
        </div>
        <button
          onClick={() => goDate(addDaysISO(date, 1))}
          disabled={date >= todayISO()}
          aria-label="Next day"
          className="min-h-[44px] rounded-full bg-white px-5 py-2.5 text-sm font-medium shadow-sm disabled:opacity-40"
        >
          →
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
            <div className="lg:col-span-2 lg:sticky lg:top-4">
              <TotalsHeader totals={totals} profile={profile} />

              {/* smart entry CTA */}
              <button
                onClick={() => {
                  setSmartMeal("breakfast");
                  setSmartOpen(true);
                }}
                className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
              >
                ✨ Smart log — describe or dictate a meal
              </button>
            </div>

            <div className="mt-4 space-y-4 lg:col-span-3 lg:mt-0">
              {MEAL_TYPES.map((t) => {
                const meal = mealsByType.get(t);
                const items = meal?.items ?? [];
                const mt: DayTotals = items.reduce((a, it) => addTotals(a, itemTotals(it)), { ...EMPTY_TOTALS });
                return (
                  <section key={t} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="min-w-0 font-bold">
                        {MEAL_LABELS[t]}
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          {Math.round(mt.calories)} kcal · {round1(mt.protein_g)}p / {round1(mt.carbs_g)}c / {round1(mt.fat_g)}f
                        </span>
                      </h2>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => {
                            setQuickMeal(t);
                            setQuickOpen(true);
                          }}
                          title="Quick add"
                          aria-label={`Quick add to ${MEAL_LABELS[t]}`}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-100 px-3 py-2 text-xs font-medium"
                        >
                          ⚡
                        </button>
                        <button
                          onClick={() => {
                            setSmartMeal(t);
                            setSmartOpen(true);
                          }}
                          title="Smart log"
                          aria-label={`Smart log to ${MEAL_LABELS[t]}`}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-100 px-3 py-2 text-xs font-medium"
                        >
                          ✨
                        </button>
                        <button
                          onClick={() => {
                            setScanMeal(t);
                            setScanOpen(true);
                          }}
                          title="Scan barcode"
                          aria-label={`Scan barcode to ${MEAL_LABELS[t]}`}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-100 px-3 py-2 text-xs font-medium"
                        >
                          📷
                        </button>
                        <button
                          onClick={() => openAdd(t)}
                          className="min-h-[44px] rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                  {items.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-400">Nothing logged yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-2">
                          {it.photo_url && photoUrls.get(it.photo_url) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoUrls.get(it.photo_url)!}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{it.name}</div>
                            <div className="text-xs text-gray-500">
                              {it.quantity ? `${it.quantity} · ` : ""}
                              {Math.round(Number(it.calories))} kcal · {round1(Number(it.protein_g))}p/
                              {round1(Number(it.carbs_g))}c/{round1(Number(it.fat_g))}f
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => openEdit(it)}
                              aria-label={`Edit ${it.name}`}
                              className="flex h-11 w-11 items-center justify-center text-sm text-gray-400"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteItem(it)}
                              aria-label={`Delete ${it.name}`}
                              className="flex h-11 w-11 items-center justify-center text-sm text-gray-400"
                            >
                              🗑️
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
            </div>
          </div>
        </>
      )}

      {userId && (
        <>
          <EntryModal
            open={entryOpen}
            onClose={() => setEntryOpen(false)}
            onSaved={load}
            userId={userId}
            mealId={entryMealId}
            item={editingItem}
            defaults={entryDefaults}
            existingPhotoUrl={editingItem?.photo_url ? photoUrls.get(editingItem.photo_url) ?? null : null}
          />
          <ScanModal
            open={scanOpen}
            onClose={() => setScanOpen(false)}
            mealType={scanMeal}
            onDone={(draft, photoFile) => {
              setScanOpen(false);
              getOrCreateMeal(supabase, userId, date, scanMeal).then((mealId) => {
                setEntryMealId(mealId);
                setEditingItem(null);
                setEntryDefaults({ ...draft, photoFile });
                setEntryOpen(true);
              });
            }}
          />
          <SmartEntry
            open={smartOpen}
            onClose={() => setSmartOpen(false)}
            onSaved={load}
            userId={userId}
            date={date}
            defaultMealType={smartMeal}
          />
          <QuickAdd
            open={quickOpen}
            onClose={() => setQuickOpen(false)}
            onPick={(draft) => {
              setQuickOpen(false);
              getOrCreateMeal(supabase, userId, date, quickMeal).then((mealId) => {
                setEntryMealId(mealId);
                setEditingItem(null);
                setEntryDefaults(draft);
                setEntryOpen(true);
              });
            }}
            userId={userId}
            date={date}
            mealType={quickMeal}
            onSaved={load}
          />
        </>
      )}
    </main>
  );
}
