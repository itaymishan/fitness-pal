"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import {
  getBodyMetrics,
  getRangeDays,
  getSignedUrls,
  deletePhoto,
  type RangeDay,
} from "@/lib/data";
import { BODY_FIELDS, type BodyMetric, type BodyMetricKey } from "@/lib/body";
import { todayISO, addDaysISO } from "@/lib/utils";
import BodyMetricsModal from "@/components/BodyMetricsModal";

type BodyChoice = "weight_kg" | "muscle_mass_kg" | "body_fat_pct" | "bmi";
type FoodChoice = "calories" | "protein_g" | "carbs_g" | "fat_g";

const BODY_CHOICES: { key: BodyChoice; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Weight", unit: "kg" },
  { key: "muscle_mass_kg", label: "Muscle mass", unit: "kg" },
  { key: "body_fat_pct", label: "Body fat", unit: "%" },
  { key: "bmi", label: "BMI", unit: "" },
];

const FOOD_CHOICES: { key: FoodChoice; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

const RANGE_DAYS = [30, 90, 180];

/** All photo paths for an entry (new array column, falling back to the legacy single column). */
function entryPhotos(m: BodyMetric): string[] {
  if (m.photo_urls && m.photo_urls.length > 0) return m.photo_urls;
  return m.photo_url ? [m.photo_url] : [];
}

function prettyDT(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BodyClient() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<BodyMetric[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [rangeDays, setRangeDays] = useState(90);
  const [bodyChoice, setBodyChoice] = useState<BodyChoice>("weight_kg");
  const [foodChoice, setFoodChoice] = useState<FoodChoice>("calories");
  const [rangeFood, setRangeFood] = useState<RangeDay[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const metrics = await getBodyMetrics(supabase, user.id);
    setEntries(metrics);
    const paths = metrics.flatMap((m) => entryPhotos(m));
    setPhotoUrls(await getSignedUrls(supabase, paths));
    const from = addDaysISO(todayISO(), -(rangeDays - 1));
    setRangeFood(await getRangeDays(supabase, user.id, from, todayISO()));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteEntry(entry: BodyMetric) {
    if (!confirm("Delete this measurement?")) return;
    for (const p of entryPhotos(entry)) {
      await deletePhoto(supabase, p).catch(() => {});
    }
    await supabase.from("body_metrics").delete().eq("id", entry.id);
    load();
  }

  const series = useMemo(() => {
    const from = addDaysISO(todayISO(), -(rangeDays - 1));
    const foodByDate = new Map(rangeFood.map((d) => [d.date, d.totals]));
    const bodyByDate = new Map<string, number | null>();
    for (const m of entries) {
      const d = m.measured_at.slice(0, 10);
      if (d < from) continue;
      const v = m[bodyChoice];
      // keep the latest reading per day
      if (!bodyByDate.has(d) || (bodyByDate.get(d) == null && v != null)) {
        bodyByDate.set(d, v);
      }
    }
    const out = [];
    for (let i = 0; i < rangeDays; i++) {
      const date = addDaysISO(from, i);
      const food = foodByDate.get(date);
      out.push({
        date,
        label: new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
        body: bodyByDate.get(date) ?? null,
        food: food ? Math.round(food[foodChoice]) : 0,
      });
    }
    return out;
  }, [entries, rangeFood, rangeDays, bodyChoice, foodChoice]);

  const bodyLabel = BODY_CHOICES.find((c) => c.key === bodyChoice)!;
  const foodLabel = FOOD_CHOICES.find((c) => c.key === foodChoice)!;
  const latest = entries[0];

  return (
    <main className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">⚖️ Body</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="min-h-[44px] rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white"
        >
          + Add screenshot
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          {latest && (
            <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">Latest — {prettyDT(latest.measured_at)}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ["weight_kg", "kg"],
                    ["body_fat_pct", "%"],
                    ["muscle_mass_kg", "kg"],
                  ] as const
                ).map(([k, unit]) => (
                  <div key={k}>
                    <div className="text-xl font-bold">
                      {latest[k] ?? "—"}
                      {latest[k] != null && <span className="text-xs font-normal text-gray-500"> {unit}</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {BODY_FIELDS.find((f) => f.key === k)!.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bodyChoice}
                onChange={(e) => setBodyChoice(e.target.value as BodyChoice)}
                className="min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm"
              >
                {BODY_CHOICES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}{c.unit ? ` (${c.unit})` : ""}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">vs</span>
              <select
                value={foodChoice}
                onChange={(e) => setFoodChoice(e.target.value as FoodChoice)}
                className="min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm"
              >
                {FOOD_CHOICES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label} ({c.unit})
                  </option>
                ))}
              </select>
              <div className="ml-auto flex gap-1">
                {RANGE_DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setRangeDays(d)}
                    className={`min-h-[44px] rounded-full px-3 text-xs font-medium ${
                      rangeDays === d ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="body" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <YAxis yAxisId="food" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="food"
                    dataKey="food"
                    name={`${foodLabel.label} (${foodLabel.unit})`}
                    fill="#d1d5db"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="body"
                    type="monotone"
                    dataKey="body"
                    name={`${bodyLabel.label}${bodyLabel.unit ? ` (${bodyLabel.unit})` : ""}`}
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Body readings (line) overlaid with logged {foodLabel.label.toLowerCase()} (bars).
              Days you didn't log food show 0.
            </p>
          </section>

          <section className="mt-4 space-y-3 pb-8">
            <h2 className="font-bold">Measurements</h2>
            {entries.length === 0 && (
              <p className="text-sm text-gray-400">
                No measurements yet — add a screenshot of your scale app to start tracking.
              </p>
            )}
            {entries.map((m) => (
              <div key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{prettyDT(m.measured_at)}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                      {BODY_FIELDS.filter((f) => m[f.key] != null).map((f) => (
                        <span key={f.key}>
                          {f.label}: <span className="font-medium">{m[f.key]}</span>
                          {f.unit ? ` ${f.unit}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {entryPhotos(m).map(
                      (p) =>
                        photoUrls.get(p) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={p}
                            src={photoUrls.get(p)!}
                            alt="Screenshot"
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        )
                    )}
                    <button
                      onClick={() => deleteEntry(m)}
                      aria-label="Delete measurement"
                      className="flex h-11 w-11 items-center justify-center text-sm text-gray-400"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {userId && (
        <BodyMetricsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={load}
          userId={userId}
        />
      )}
    </main>
  );
}
