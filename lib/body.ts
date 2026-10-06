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
  photo_url: string | null; // legacy single photo (use photo_urls)
  photo_urls: string[] | null;
  created_at: string;
}

export type BodyMetricKey = Exclude<
  keyof BodyMetric,
  "id" | "user_id" | "measured_at" | "photo_url" | "photo_urls" | "created_at"
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
 *  The detail rows have a fixed 3-column layout, so we anchor on each row's
 *  label line and read the values from the line above it, positionally.
 *  Anything unreadable stays null for the user to fill in the review.
 *  Values are best-effort — the caller shows them in an editable review. */
export function parseBodyScreenshot(text: string): {
  measuredAt: Date | null;
  values: BodyMetricValues;
} {
  const norm = text.replace(/\|/g, "I").replace(/\r/g, "\n");
  const lines = norm
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const values = emptyBodyValues();

  const numbers = (line: string): number[] => {
    const out: number[] = [];
    for (const m of line.matchAll(/(\d+[.,]?\d*)/g)) {
      const v = parseFloat(m[1].replace(",", "."));
      if (Number.isFinite(v)) out.push(Math.round(v * 100) / 100);
    }
    return out;
  };

  const sane = (v: number | undefined, max: number): number | null =>
    v !== undefined && v > 0 && v <= max ? v : null;

  // label-line pattern -> [field keys in column order, per-column max sane value]
  const rows: { label: RegExp; fields: [BodyMetricKey, number][] }[] = [
    { label: /^\s*weight\s+bmi\s+body\s+fat/i, fields: [["weight_kg", 250], ["bmi", 80], ["body_fat_pct", 80]] },
    { label: /fat[\s-]*free/i, fields: [["fat_free_weight_kg", 250], ["subcutaneous_fat_pct", 80], ["visceral_fat", 60]] },
    { label: /body\s+water/i, fields: [["body_water_pct", 90], ["skeletal_muscle_pct", 80], ["muscle_mass_kg", 200]] },
    { label: /bone\s+mass/i, fields: [["bone_mass_kg", 20], ["protein_pct", 60], ["bmr_kcal", 5000]] },
    { label: /metabolic\s+age/i, fields: [["metabolic_age", 120]] },
  ];

  for (let i = 0; i < lines.length; i++) {
    const row = rows.find((r) => r.label.test(lines[i]));
    if (!row || i === 0) continue;
    const vals = numbers(lines[i - 1]);
    row.fields.forEach(([key, max], col) => {
      const v = sane(vals[col], max);
      if (v !== null) values[key] = v;
    });
  }

  // Fallback: label-anchored regexes for anything still missing.
  const anchored: [BodyMetricKey, RegExp, number][] = [
    ["weight_kg", /([0-9]+[.,]?[0-9]*)\s*kg\s*(?!fat)(?=weight)weight/i, 250],
    ["fat_free_weight_kg", /([0-9]+[.,]?[0-9]*)\s*kg\s*fat[\s-]*free\s*body\s*weight/i, 250],
    ["muscle_mass_kg", /([0-9]+[.,]?[0-9]*)\s*kg\s*muscle\s*mass/i, 200],
    ["bone_mass_kg", /([0-9]+[.,]?[0-9]*)\s*kg\s*bone\s*mass/i, 20],
    ["body_fat_pct", /([0-9]+[.,]?[0-9]*)\s*%\s*body\s*fat/i, 80],
    ["subcutaneous_fat_pct", /([0-9]+[.,]?[0-9]*)\s*%\s*subcutaneous\s*fat/i, 80],
    ["body_water_pct", /([0-9]+[.,]?[0-9]*)\s*%\s*body\s*water/i, 90],
    ["skeletal_muscle_pct", /([0-9]+[.,]?[0-9]*)\s*%\s*skeletal\s*muscle/i, 80],
    ["protein_pct", /([0-9]+[.,]?[0-9]*)\s*%\s*protein/i, 60],
    ["bmi", /([0-9]+[.,]?[0-9]*)\s*bmi/i, 80],
    ["visceral_fat", /([0-9]+[.,]?[0-9]*)\s*visceral\s*fat/i, 60],
    ["bmr_kcal", /([0-9]+[.,]?[0-9]*)\s*kcal\s*bmr/i, 5000],
    ["metabolic_age", /([0-9]{1,3})\s*metabolic\s*age/i, 120],
  ];
  for (const [key, re, max] of anchored) {
    if (values[key] !== null) continue;
    let best: number | null = null;
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of norm.matchAll(g)) {
      const v = parseFloat(m[1].replace(",", "."));
      if (Number.isFinite(v) && v > 0 && v <= max && (best === null || v > best)) {
        best = Math.round(v * 100) / 100;
      }
    }
    if (best !== null) values[key] = best;
  }

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

/**
 * Prepare a scale-app screenshot for OCR: crop to the detail-rows area,
 * upscale 2x, grayscale + normalize. The colored numbers on white read far
 * better this way than raw tesseract on the full screenshot.
 */
export async function preprocessScreenshot(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const W = bitmap.width;
  const H = bitmap.height;
  const cropTop = Math.round(H * 0.24);
  const cropH = Math.round(H * 0.7);
  const scale = 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(cropH * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, cropTop, W, cropH, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  const lum = new Float32Array(px.length / 4);
  let min = 255;
  let max = 0;
  for (let i = 0; i < lum.length; i++) {
    const l = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    lum[i] = l;
    if (l < min) min = l;
    if (l > max) max = l;
  }
  const span = Math.max(1, max - min);
  for (let i = 0; i < lum.length; i++) {
    const v = Math.round(((lum[i] - min) / span) * 255);
    px[i * 4] = v;
    px[i * 4 + 1] = v;
    px[i * 4 + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob((b) => res(b), "image/png")
  );
  return blob ?? file;
}
