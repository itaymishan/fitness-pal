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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [ocrInfo, setOcrInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStage("pick");
    setValues(emptyBodyValues());
    setMeasuredAt(toDateTimeLocal(new Date()));
    setPhotoFile(null);
    setPhotoPreview(null);
    setOcrInfo(null);
    setError(null);
  }, [open ]);

  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  if (!open) return null;

  function setField(key: keyof BodyMetricValues, v: string) {
    setValues((prev) => ({ ...prev, [key]: v === "" ? null : (numOrNull(v) ?? null) }));
  }

  async function handlePhoto(file: File) {
    setStage("ocr-running");
    setError(null);
    setOcrInfo(null);
    setPhotoFile(file);
    try {
      const T = await import("tesseract.js");
      const worker = await T.createWorker("eng");
      // Treat the preprocessed crop as a uniform block of text.
      await worker.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_BLOCK });
      const ocrInput = await preprocessScreenshot(file);
      const { data } = await worker.recognize(ocrInput);
      await worker.terminate();
      const parsed = parseBodyScreenshot(data.text ?? "");
      setValues(parsed.values);
      const found = BODY_FIELDS.filter((f) => parsed.values[f.key] !== null).length;
      if (parsed.measuredAt) {
        setMeasuredAt(toDateTimeLocal(parsed.measuredAt));
      }
      if (found === 0) {
        setOcrInfo(
          "Couldn't pull numbers from that screenshot automatically — fill in the values by hand (the screenshot is still attached for reference)."
        );
      } else {
        setOcrInfo(
          `Read ${found} value${found === 1 ? "" : "s"} from the screenshot — verify each one before saving.`
        );
        if (!parsed.measuredAt) {
          setOcrInfo(
            (prev) => `${prev ?? ""} Couldn't read a date — set it manually below.`
          );
        }
      }
      setStage("review");
    } catch {
      setError("Couldn't read that screenshot — enter the values manually.");
      setStage("review");
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
      let photoPath: string | null = null;
      if (photoFile) {
        photoPath = await uploadBodyPhoto(supabase, userId, photoFile);
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
        photo_url: photoPath,
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
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white"
            >
              📸 Upload a scale-app screenshot
            </button>
            <button
              onClick={() => setStage("review")}
              className="w-full rounded-xl border border-gray-300 py-3 font-semibold text-gray-700"
            >
              ⌨️ Enter values manually
            </button>
            <p className="text-xs text-gray-500">
              The app reads the numbers and date from the screenshot — you review and fix
              everything before saving.
            </p>
          </div>
        )}

        {stage === "ocr-running" && (
          <div className="py-10 text-center">
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Screenshot" className="mx-auto mb-4 h-40 rounded-xl object-cover" />
            )}
            <p className="text-sm text-gray-500">Reading the screenshot…</p>
          </div>
        )}

        {stage === "review" && (
          <div className="space-y-3">
            {ocrInfo && <p className="text-xs text-emerald-700">{ocrInfo}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {photoPreview && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Screenshot" className="h-32 w-full rounded-xl object-cover" />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white"
                >
                  Remove
                </button>
              </div>
            )}
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Measurement date & time</span>
              <input
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
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
