/** Body composition metrics (Renpho-style scale screenshots). */

export interface BodyMetric {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  fat_free_weight_kg: number | null;
  subcutaneous_fat_pct: number | null;
  visceral_fat: number | null;
  body_water_pct: number | null;
  skeletal_muscle_pct: number | null;
  muscle_mass_kg: number | null;
  bone_mass_kg: number | null;
  protein_pct: number | null;
  bmr_kcal: number | null;
  metabolic_age: number | null;
  photo_url: string | null;
  created_at: string;
}

export type BodyMetricKey = Exclude<
  keyof BodyMetric,
  "id" | "user_id" | "measured_at" | "photo_url" | "created_at"
>;

export const BODY_FIELDS: { key: BodyMetricKey; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Weight", unit: "kg" },
  { key: "bmi", label: "BMI", unit: "" },
  { key: "body_fat_pct", label: "Body Fat", unit: "%" },
  { key: "fat_free_weight_kg", label: "Fat-free Body Weight", unit: "kg" },
  { key: "subcutaneous_fat_pct", label: "Subcutaneous Fat", unit: "%" },
  { key: "visceral_fat", label: "Visceral Fat", unit: "" },
  { key: "body_water_pct", label: "Body Water", unit: "%" },
  { key: "skeletal_muscle_pct", label: "Skeletal Muscle", unit: "%" },
  { key: "muscle_mass_kg", label: "Muscle Mass", unit: "kg" },
  { key: "bone_mass_kg", label: "Bone Mass", unit: "kg" },
  { key: "protein_pct", label: "Protein", unit: "%" },
  { key: "bmr_kcal", label: "BMR", unit: "kcal" },
  { key: "metabolic_age", label: "Metabolic Age", unit: "" },
];

export type BodyMetricValues = Record<BodyMetricKey, number | null>;

export function emptyBodyValues(): BodyMetricValues {
  return {
    weight_kg: null,
    bmi: null,
    body_fat_pct: null,
    fat_free_weight_kg: null,
    subcutaneous_fat_pct: null,
    visceral_fat: null,
    body_water_pct: null,
    skeletal_muscle_pct: null,
    muscle_mass_kg: null,
    bone_mass_kg: null,
    protein_pct: null,
    bmr_kcal: null,
    metabolic_age: null,
  };
}

/** Parse OCR text of a Renpho-style body composition screenshot.
 *  Values are best-effort — the caller shows them in an editable review. */
export function parseBodyScreenshot(text: string): {
  measuredAt: Date | null;
  values: BodyMetricValues;
} {
  const norm = text.replace(/[|]/g, "I").replace(/\r/g, "\n");
  const values = emptyBodyValues();

  // Screenshots can show small deltas ("+0.25kg Weight") next to the real
  // value — take the largest plausible match for each field.
  function findMax(patterns: RegExp[], maxSane: number): number | null {
    let best: number | null = null;
    for (const re of patterns) {
      const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      for (const m of norm.matchAll(global)) {
        const v = parseFloat(m[1].replace(",", "."));
        if (Number.isFinite(v) && v > 0 && v <= maxSane && (best === null || v > best)) {
          best = Math.round(v * 100) / 100;
        }
      }
    }
    return best;
  }

  const NL = String.raw`[\s]*`;
  const kg = (label: string) =>
    new RegExp(String.raw`([0-9]+[.,]?[0-9]*)${NL}kg${NL}${label}`, "i");
  const pct = (label: string) =>
    new RegExp(String.raw`([0-9]+[.,]?[0-9]*)${NL}%${NL}${label}`, "i");
  const plain = (label: string) =>
    new RegExp(String.raw`([0-9]+[.,]?[0-9]*)${NL}${label}`, "i");

  values.fat_free_weight_kg = findMax(
    [kg(String.raw`fat${NL}[- ]?free${NL}body${NL}weight`)],
    250
  );
  values.weight_kg = findMax(
    [new RegExp(String.raw`\+?([0-9]+[.,]?[0-9]*)${NL}kg${NL}(?!fat)(?=weight)weight`, "i")],
    250
  );
  values.muscle_mass_kg = findMax([kg(String.raw`muscle${NL}mass`)], 200);
  values.bone_mass_kg = findMax([kg(String.raw`bone${NL}mass`)], 20);
  values.body_fat_pct = findMax([pct(String.raw`body${NL}fat`)], 80);
  values.subcutaneous_fat_pct = findMax([pct(String.raw`subcutaneous${NL}fat`)], 80);
  values.body_water_pct = findMax([pct(String.raw`body${NL}water`)], 90);
  values.skeletal_muscle_pct = findMax([pct(String.raw`skeletal${NL}muscle`)], 80);
  values.protein_pct = findMax([pct(String.raw`protein`)], 60);
  values.bmi = findMax([plain(String.raw`bmi`)], 80);
  values.visceral_fat = findMax([plain(String.raw`visceral${NL}fat`)], 60);
  values.bmr_kcal = findMax(
    [new RegExp(String.raw`([0-9]+[.,]?[0-9]*)${NL}kcal${NL}bmr`, "i")],
    5000
  );
  values.metabolic_age = findMax(
    [new RegExp(String.raw`([0-9]{1,3})${NL}metabolic${NL}age`, "i")],
    120
  );

  // "March 19, 2025 10:53 p.m."
  const dm = norm.match(
    /([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i
  );
  let measuredAt: Date | null = null;
  if (dm) {
    const month = new Date(`${dm[1]} 1, 2000`).getMonth();
    if (!Number.isNaN(month)) {
      let h = parseInt(dm[4], 10) % 12;
      if (/p/i.test(dm[6])) h += 12;
      measuredAt = new Date(
        parseInt(dm[3], 10),
        month,
        parseInt(dm[2], 10),
        h,
        parseInt(dm[5], 10)
      );
    }
  }

  return { measuredAt, values };
}

/** Format a Date for a datetime-local input. */
export function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
