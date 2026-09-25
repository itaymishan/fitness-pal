"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { getRangeDays, getProfile, type RangeDay } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { todayISO, addDaysISO, prettyDate, downloadCSV, round1 } from "@/lib/utils";

type RangeKey = "week" | "month" | "3months";
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "3months", label: "3 Months", days: 90 },
];

const DEFAULT_PROFILE: Profile = {
  id: "",
  calorie_target: 2200,
  protein_target_g: 150,
  carb_target_g: 250,
  fat_target_g: 70,
};

export default function HistoryClient() {
  const supabase = createClient();
  const [range, setRange] = useState<RangeKey>("week");
  const [days, setDays] = useState<RangeDay[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const rangeDays = RANGES.find((r) => r.key === range)!.days;
  const from = addDaysISO(todayISO(), -(rangeDays - 1));
  const to = todayISO();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [prof, rangeData] = await Promise.all([
      getProfile(supabase, user.id),
      getRangeDays(supabase, user.id, from, to),
    ]);
    setProfile(prof);
    setDays(rangeData);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // Fill every date in the range (zeros for unlogged days)
  const series = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const out = [];
    for (let i = 0; i < rangeDays; i++) {
      const date = addDaysISO(from, i);
      const d = byDate.get(date);
      out.push({
        date,
        label: new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
        calories: Math.round(d?.totals.calories ?? 0),
        protein: round1(d?.totals.protein_g ?? 0),
        carbs: round1(d?.totals.carbs_g ?? 0),
        fat: round1(d?.totals.fat_g ?? 0),
        logged: !!d,
      });
    }
    return out;
  }, [days, from, rangeDays]);

  const logged = series.filter((s) => s.logged);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  function exportCSV() {
    const rows = [
      ["date", "calories", "protein_g", "carbs_g", "fat_g", "items_logged"],
      ...days.map((d) => [
        d.date,
        String(Math.round(d.totals.calories)),
        String(round1(d.totals.protein_g)),
        String(round1(d.totals.carbs_g)),
        String(round1(d.totals.fat_g)),
        String(d.itemCount),
      ]),
    ];
    downloadCSV(`meal-tracker-${from}-to-${to}.csv`, rows);
  }

  return (
    <main className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📈 History & Trends</h1>
        <button
          onClick={exportCSV}
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold shadow-sm"
        >
          ⬇ CSV
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-xl py-2 text-sm font-medium ${
              range === r.key ? "bg-gray-900 text-white" : "bg-white text-gray-600 shadow-sm"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          {/* period summary */}
          <section className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Avg kcal", value: String(Math.round(avg(logged.map((s) => s.calories)))) },
              { label: "Avg protein", value: `${Math.round(avg(logged.map((s) => s.protein)))}g` },
              { label: "Days logged", value: `${logged.length}/${rangeDays}` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-3 text-center shadow-sm">
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </section>

          {/* calories chart */}
          <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold">Calories vs target</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.ceil(rangeDays / 8)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <ReferenceLine
                    y={profile.calorie_target}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    label={{ value: "target", fontSize: 10, fill: "#059669" }}
                  />
                  <Bar dataKey="calories" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* macros chart */}
          <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold">Protein / carbs / fat (g)</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.ceil(rangeDays / 8)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="protein" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="carbs" stroke="#f59e0b" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="fat" stroke="#f43f5e" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* day list -> jump to diary */}
          <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold">Logged days</h2>
            {logged.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Nothing logged in this range yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {[...logged].reverse().map((s) => (
                  <li key={s.date}>
                    <Link
                      href={`/diary?date=${s.date}`}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-sm font-medium">{prettyDate(s.date)}</span>
                      <span className="text-sm text-gray-500">
                        {s.calories} kcal · {s.protein}p/{s.carbs}c/{s.fat}f
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
