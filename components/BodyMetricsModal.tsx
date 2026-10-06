"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadBodyPhoto } from "@/lib/data";
import {
  BODY_FIELDS,
  emptyBodyValues,
  parseBodyScreenshot,
  preprocessScreenshot,
  toDateTimeLocal,
  type BodyMetricValues,
} from "@/lib/body";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

type Stage = "pick" | "ocr-running" | "review";

interface Photo {
  file: File;
  url: string;
}

const numOrNull = (v: string): number | null => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export default function BodyMetricsModal({ open, onClose, onSaved, userId }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("pick");
  const [values, setValues] = useState<BodyMetricValues>(emptyBodyValues());
  const [measuredAt, setMeasuredAt] = useState("");
  const [dateTouched, setDateTouched] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ocrProgress, setOcrProgress] = useState("");
  const [ocrInfo, setOcrInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStage("pick");
    setValues(emptyBodyValues());
    setMeasuredAt(toDateTimeLocal(new Date()));
    setDateTouched(false);
    setPhotos([]);
    setOcrProgress("");
    setOcrInfo(null);
    setError(null);
  }, [open ]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  function setField(key: keyof BodyMetricValues, v: string) {
    setValues((prev) => ({ ...prev, [key]: v === "" ? null : (numOrNull(v) ?? null) }));
  }

  function removePhoto(url: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.url === url);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.url !== url);
    });
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const fresh: Photo[] = [...list]
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    if (fresh.length === 0) return;

    setPhotos((prev) => [...prev, ...fresh]);
    setStage("ocr-running");
    setError(null);

    try {
      const T = await import("tesseract.js");
      const worker = await T.createWorker("eng");
      // Treat each preprocessed crop as a uniform block of text.
      await worker.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_BLOCK });

      const merged = { ...values };
      let foundDate: Date | null = null;
      let readCount = 0;
      for (let i = 0; i < fresh.length; i++) {
        setOcrProgress(`Reading screenshot ${i + 1} of ${fresh.length}…`);
        const ocrInput = await preprocessScreenshot(fresh[i].file);
        const { data } = await worker.recognize(ocrInput);
        const parsed = parseBodyScreenshot(data.text ?? "");
        for (const f of BODY_FIELDS) {
          if (merged[f.key] === null && parsed.values[f.key] !== null) {
            merged[f.key] = parsed.values[f.key];
            readCount++;
          }
        }
        if (!foundDate && parsed.measuredAt) foundDate = parsed.measuredAt;
      }
      await worker.terminate();

      setValues(merged);
      if (foundDate && !dateTouched) {
        setMeasuredAt(toDateTimeLocal(foundDate));
      }
      const total = BODY_FIELDS.filter((f) => merged[f.key] !== null).length;
      if (total === 0) {
        setOcrInfo(
          "Couldn't pull numbers from the screenshots automatically — fill in the values by hand (the screenshots are still attached for reference)."
        );
      } else {
        setOcrInfo(
          `Read ${total} value${total === 1 ? "" : "s"} from the screenshot${fresh.length > 1 ? "s" : ""} — verify each one before saving.`
        );
      }
      setStage("review");
    } catch {
      setError("Couldn't read the screenshots — enter the values manually.");
      setStage("review");
    } finally {
      setOcrProgress("");
    }
  }

  async function handleSave() {
    if (!measuredAt) {
      setError("Pick the measurement date and time.");
      return;
    }
    if (Object.values(values).every((v) => v === null)) {
      setError("Enter at least one value.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const paths: string[] = [];
      for (const p of photos) {
        paths.push(await uploadBodyPhoto(supabase, userId, p.file));
      }
      const { error } = await supabase.from("body_metrics").insert({
        user_id: userId,
        measured_at: new Date(measuredAt).toISOString(),
        weight_kg: values.weight_kg,
        bmi: values.bmi,
        body_fat_pct: values.body_fat_pct,
        fat_free_weight_kg: values.fat_free_weight_kg,
        subcutaneous_fat_pct: values.subcutaneous_fat_pct,
        visceral_fat: values.visceral_fat,
        body_water_pct: values.body_water_pct,
        skeletal_muscle_pct: values.skeletal_muscle_pct,
        muscle_mass_kg: values.muscle_mass_kg,
        bone_mass_kg: values.bone_mass_kg,
        protein_pct: values.protein_pct,
        bmr_kcal: values.bmr_kcal,
        metabolic_age: values.metabolic_age,
        photo_urls: paths.length > 0 ? paths : null,
      });
      if (error) throw error;
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">⚖️ Add body metrics</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm"
          >
            ✕
          </button>
        </div>

        {stage === "pick" && (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white"
            >
              📸 Upload scale-app screenshots
            </button>
            <button
              onClick={() => setStage("review")}
              className="w-full rounded-xl border border-gray-300 py-3 font-semibold text-gray-700"
            >
              ⌨️ Enter values manually
            </button>
            <p className="text-xs text-gray-500">
              You can select several screenshots at once — the app reads the numbers and
              date from all of them together, and you review everything before saving.
            </p>
          </div>
        )}

        {stage === "ocr-running" && (
          <div className="py-10 text-center">
            <div className="mb-4 flex justify-center gap-2">
              {photos.slice(-3).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.url} src={p.url} alt="Screenshot" className="h-32 rounded-xl object-cover" />
              ))}
            </div>
            <p className="text-sm text-gray-500">{ocrProgress || "Reading…"}</p>
          </div>
        )}

        {stage === "review" && (
          <div className="space-y-3">
            {ocrInfo && <p className="text-xs text-emerald-700">{ocrInfo}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {photos.length > 0 && (
              <div>
                <div className="flex gap-2 overflow-x-auto">
                  {photos.map((p) => (
                    <div key={p.url} className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="Screenshot" className="h-28 rounded-xl object-cover" />
                      <button
                        onClick={() => removePhoto(p.url)}
                        aria-label="Remove screenshot"
                        className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-sm font-medium text-emerald-700"
                >
                  + Add another screenshot
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Measurement date & time</span>
              <input
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => {
                  setMeasuredAt(e.target.value);
                  setDateTouched(true);
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {BODY_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-xs font-medium text-gray-500">
                    {f.label}{f.unit ? ` (${f.unit})` : ""}
                  </span>
                  <input
                    type="number" inputMode="decimal"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder="—"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save metrics"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
