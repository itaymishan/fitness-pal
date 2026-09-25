import type { DayTotals, Profile } from "@/lib/types";
import { round1 } from "@/lib/utils";
import ProgressBar from "./ProgressBar";

export default function TotalsHeader({
  totals,
  profile,
}: {
  totals: DayTotals;
  profile: Profile;
}) {
  const macros = [
    { label: "Protein", value: totals.protein_g, target: profile.protein_target_g, unit: "g", color: "bg-sky-500" },
    { label: "Carbs", value: totals.carbs_g, target: profile.carb_target_g, unit: "g", color: "bg-amber-500" },
    { label: "Fat", value: totals.fat_g, target: profile.fat_target_g, unit: "g", color: "bg-rose-500" },
  ];
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-bold">{Math.round(totals.calories)}</div>
          <div className="text-xs text-gray-500">
            of {profile.calorie_target} kcal
          </div>
        </div>
        <div className="text-xs font-medium text-gray-500">
          {Math.max(0, profile.calorie_target - Math.round(totals.calories))} kcal left
        </div>
      </div>
      <div className="mt-2">
        <ProgressBar value={totals.calories} target={profile.calorie_target} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <div key={m.label}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-gray-600">{m.label}</span>
              <span className="text-gray-500">
                {round1(m.value)}/{m.target}g
              </span>
            </div>
            <div className="mt-1">
              <ProgressBar value={m.value} target={m.target} color={m.color} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
