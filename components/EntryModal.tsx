"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPhoto, deletePhoto } from "@/lib/data";
import type { MealItem } from "@/lib/types";

export interface EntryDraft {
  name: string;
  quantity?: string | null;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  notes?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  mealId: string;
  /** edit mode */
  item?: MealItem | null;
  /** prefill for quick-add / smart entry */
  defaults?: EntryDraft | null;
  existingPhotoUrl?: string | null;
}

export default function EntryModal({
  open,
  onClose,
  onSaved,
  userId,
  mealId,
  item,
  defaults,
  existingPhotoUrl,
}: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const src = item ?? defaults;
    setName(src?.name ?? "");
    setQuantity(src?.quantity ?? "");
    setCalories(src?.calories != null && src.calories !== 0 ? String(src.calories) : "");
    setProtein(src?.protein_g != null && src.protein_g !== 0 ? String(src.protein_g) : "");
    setCarbs(src?.carbs_g != null && src.carbs_g !== 0 ? String(src.carbs_g) : "");
    setFat(src?.fat_g != null && src.fat_g !== 0 ? String(src.fat_g) : "");
    setNotes(src && "notes" in src ? (src.notes as string | null) ?? "" : "");
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    setSaveFavorite(false);
    setError(null);
  }, [open, item, defaults]);

  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  if (!open) return null;

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  async function handleSave() {
    if (!name.trim()) {
      setError("Give the food a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let photoPath: string | null = item?.photo_url ?? null;

      if (removePhoto && item?.photo_url) {
        await deletePhoto(supabase, item.photo_url);
        photoPath = null;
      }
      if (photoFile) {
        if (item?.photo_url && !removePhoto) {
          await deletePhoto(supabase, item.photo_url).catch(() => {});
        }
        photoPath = await uploadPhoto(supabase, userId, mealId, photoFile);
      }

      const payload = {
        name: name.trim(),
        quantity: quantity.trim() || null,
        calories: num(calories),
        protein_g: num(protein),
        carbs_g: num(carbs),
        fat_g: num(fat),
        notes: notes.trim() || null,
        photo_url: photoPath,
      };

      if (item) {
        const { error } = await supabase
          .from("meal_items")
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("meal_items")
          .insert({ ...payload, meal_id: mealId });
        if (error) throw error;
      }

      if (saveFavorite) {
        await supabase.from("favorites").upsert(
          {
            user_id: userId,
            name: name.trim(),
            quantity: quantity.trim() || null,
            calories: num(calories),
            protein_g: num(protein),
            carbs_g: num(carbs),
            fat_g: num(fat),
          },
          { onConflict: "user_id,name" }
        );
      }

      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the entry.");
    } finally {
      setSaving(false);
    }
  }

  const shownPhoto = photoPreview ?? (!removePhoto ? existingPhotoUrl : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{item ? "Edit entry" : "Log food"}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Food name"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
          />
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity (e.g. 2 slices, 150g)"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Calories</span>
              <input
                type="number" inputMode="decimal" value={calories}
                onChange={(e) => setCalories(e.target.value)} placeholder="0"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Protein (g)</span>
              <input
                type="number" inputMode="decimal" value={protein}
                onChange={(e) => setProtein(e.target.value)} placeholder="0"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Carbs (g)</span>
              <input
                type="number" inputMode="decimal" value={carbs}
                onChange={(e) => setCarbs(e.target.value)} placeholder="0"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Fat (g)</span>
              <input
                type="number" inputMode="decimal" value={fat}
                onChange={(e) => setFat(e.target.value)} placeholder="0"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </label>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
          />

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPhotoFile(f);
                  setRemovePhoto(false);
                }
              }}
            />
            {shownPhoto ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shownPhoto} alt="Meal" className="h-40 w-full rounded-xl object-cover" />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setRemovePhoto(true);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-600"
              >
                📷 Add a photo
              </button>
            )}
            {shownPhoto && (
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-sm font-medium text-emerald-700"
              >
                Replace photo
              </button>
            )}
          </div>

          {!item && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={saveFavorite}
                onChange={(e) => setSaveFavorite(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Save as favorite for quick add
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : item ? "Save changes" : "Add entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
