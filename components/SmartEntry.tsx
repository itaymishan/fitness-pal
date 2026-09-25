"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateMeal } from "@/lib/data";
import { parseMealText, type ParsedItem } from "@/lib/parse";
import { MEAL_LABELS, MEAL_TYPES, type MealType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  date: string;
  defaultMealType: MealType;
}

type EditableItem = ParsedItem & { id: number };

export default function SmartEntry({ open, onClose, onSaved, userId, date, defaultMealType }: Props) {
  const supabase = createClient();
  const recogRef = useRef<any>(null);

  const [text, setText] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setItems([]);
      setMealType(defaultMealType);
      setError(null);
      setVoiceError(null);
    }
  }, [open, defaultMealType]);

  useEffect(() => {
    return () => {
      try { recogRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  if (!open) return null;

  function toggleListening() {
    if (listening) {
      try { recogRef.current?.stop(); } catch { /* noop */ }
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input isn't supported in this browser — try Chrome on your phone.");
      return;
    }
    const recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = true;
    recog.continuous = false;
    let finalText = "";
    recog.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setText((prev) => {
        // replace the in-progress tail: keep it simple by appending finals
        const base = prev.replace(/\s*…$/, "");
        return (base + " " + finalText + interim + "…").trim();
      });
    };
    recog.onerror = () => {
      setVoiceError("Couldn't hear you — try again or type instead.");
      setListening(false);
    };
    recog.onend = () => {
      setListening(false);
      setText((prev) => prev.replace(/\s*…$/, "").trim());
    };
    recogRef.current = recog;
    setVoiceError(null);
    setListening(true);
    try { recog.start(); } catch { setListening(false); }
  }

  function handleParse() {
    const parsed = parseMealText(text);
    setItems(parsed.map((p, i) => ({ ...p, id: Date.now() + i })));
  }

  function updateItem(id: number, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function handleSaveAll() {
    if (items.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const mealId = await getOrCreateMeal(supabase, userId, date, mealType);
      const rows = items.map((it) => ({
        meal_id: mealId,
        name: it.name.trim() || "Unnamed food",
        quantity: it.quantity || null,
        calories: it.calories,
        protein_g: it.protein_g,
        carbs_g: it.carbs_g,
        fat_g: it.fat_g,
        notes: it.unknown ? null : it.assumption,
      }));
      const { error } = await supabase.from("meal_items").insert(rows);
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
          <h2 className="text-lg font-bold">✨ Smart log</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Describe it: "two eggs and toast, half a cup of egg whites"'
            rows={3}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
          />
          <button
            onClick={toggleListening}
            aria-label="Dictate"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
              listening ? "animate-pulse bg-red-500 text-white" : "bg-gray-100"
            }`}
          >
            🎙️
          </button>
        </div>
        {voiceError && <p className="mt-1 text-xs text-red-600">{voiceError}</p>}
        {listening && <p className="mt-1 text-xs text-gray-500">Listening… tap the mic to stop.</p>}

        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="mt-3 w-full rounded-xl bg-gray-900 py-3 font-semibold text-white disabled:opacity-40"
        >
          Figure out the nutrition
        </button>

        {items.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-500">
              Review everything below — values are estimates. Tap a field to fix it before saving.
            </p>
            {items.map((it) => (
              <div key={it.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 font-medium outline-none focus:border-emerald-600"
                  />
                  <button onClick={() => removeItem(it.id)} className="text-sm text-gray-400">✕</button>
                </div>
                <input
                  value={it.quantity}
                  onChange={(e) => updateItem(it.id, { quantity: e.target.value })}
                  placeholder="Quantity"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-600"
                />
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(
                    [
                      ["calories", "kcal"],
                      ["protein_g", "prot g"],
                      ["carbs_g", "carb g"],
                      ["fat_g", "fat g"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="block">
                      <span className="text-[10px] text-gray-500">{label}</span>
                      <input
                        type="number" inputMode="decimal"
                        value={it[k] === 0 ? "" : it[k]}
                        onChange={(e) =>
                          updateItem(it.id, { [k]: parseFloat(e.target.value) || 0 } as Partial<EditableItem>)
                        }
                        placeholder="0"
                        className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-600"
                      />
                    </label>
                  ))}
                </div>
                <p className={`mt-1.5 text-xs ${it.unknown ? "text-amber-600" : "text-gray-500"}`}>
                  {it.unknown ? "⚠️ " : "✓ "}{it.assumption}
                </p>
              </div>
            ))}

            <div>
              <span className="text-xs font-medium text-gray-500">Save to</span>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setMealType(t)}
                    className={`min-h-[44px] rounded-xl border py-2.5 text-xs font-medium ${
                      mealType === t
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {MEAL_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${items.length} item${items.length > 1 ? "s" : ""} to ${MEAL_LABELS[mealType]}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
