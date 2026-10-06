"use client";

import { useEffect, useRef, useState } from "react";
import type { EntryDraft } from "./EntryModal";
import { MEAL_LABELS, type MealType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: (draft: EntryDraft, photoFile: File | null) => void;
  mealType: MealType;
}

type Stage =
  | "scanning"
  | "looking-up"
  | "review"
  | "not-found"
  | "ocr-running"
  | "ocr-review";

interface OffProduct {
  name: string;
  brand: string;
  quantityText: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Best-effort parse of an OCR'd nutrition label. Values are always user-reviewable. */
function parseNutritionText(text: string): { kcal: number; protein: number; carbs: number; fat: number } {
  const out = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const find = (re: RegExp) => {
    const m = text.match(re);
    return m ? num(m[1].replace(",", ".")) : 0;
  };
  // prefer kcal; fall back to kJ conversion
  out.kcal = find(/(?:energy|calories?)\b[^0-9]{0,12}(\d+[.,]?\d*)\s*kcal/i);
  if (!out.kcal) {
    const kj = find(/(?:energy|calories?)\b[^0-9]{0,12}(\d+[.,]?\d*)\s*kj/i);
    if (kj) out.kcal = Math.round(kj / 4.184);
  }
  out.protein = find(/proteins?\b[^0-9]{0,12}(\d+[.,]?\d*)\s*g/i);
  out.fat = find(/(?:total\s+)?fats?\b(?!\s*(?:of|from))[^0-9]{0,12}(\d+[.,]?\d*)\s*g/i);
  out.carbs = find(/(?:total\s+)?carbohydrates?|carbs?\b[^0-9]{0,12}(\d+[.,]?\d*)\s*g/i);
  return out;
}

export default function ScanModal({ open, onClose, onDone, mealType }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannedRef = useRef(false);

  const [stage, setStage] = useState<Stage>("scanning");
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");
  const [ocrPhoto, setOcrPhoto] = useState<File | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStage("scanning");
    setCode("");
    setProduct(null);
    setName("");
    setQuantity("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setNotes("");
    setOcrPhoto(null);
    setOcrPreview(null);
    setCamError(null);
    setLookupError(null);
    setOcrError(null);
    scannedRef.current = false;
    startCamera();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  function stopCamera() {
    try {
      readerRef.current?.stop();
    } catch {
      /* noop */
    }
    readerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    setCamError(null);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (devices.length === 0) {
        setCamError("No camera found on this device.");
        return;
      }
      const back = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[devices.length - 1];
      await reader.decodeFromVideoDevice(back.deviceId, videoRef.current!, (result: any, err: any) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true;
          const text = result.getText?.() ?? String(result);
          handleBarcode(text.replace(/[^0-9]/g, ""));
        }
      });
      streamRef.current = (videoRef.current?.srcObject as MediaStream) ?? null;
    } catch (e) {
      setCamError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission was denied — allow camera access and try again."
          : "Couldn't start the camera. Check permissions and try again."
      );
    }
  }

  async function handleBarcode(barcode: string) {
    stopCamera();
    setCode(barcode);
    setStage("looking-up");
    setLookupError(null);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
          barcode
        )}.json?fields=product_name,brands,quantity,serving_size,nutriments`
      );
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        setStage("not-found");
        return;
      }
      const p = data.product;
      const n = p.nutriments ?? {};
      const r = (v: any) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);
      const prod: OffProduct = {
        name: p.product_name ?? "Unknown product",
        brand: p.brands ?? "",
        quantityText: p.serving_size ?? p.quantity ?? "",
        kcal: r(n["energy-kcal_100g"]),
        protein: r(n.proteins_100g),
        carbs: r(n.carbohydrates_100g),
        fat: r(n.fat_100g),
      };
      setProduct(prod);
      setName(prod.brand ? `${prod.name} (${prod.brand})` : prod.name);
      setQuantity(prod.quantityText ? `${prod.quantityText} (serving)` : "");
      setKcal(prod.kcal ? String(prod.kcal) : "");
      setProtein(prod.protein ? String(prod.protein) : "");
      setCarbs(prod.carbs ? String(prod.carbs) : "");
      setFat(prod.fat ? String(prod.fat) : "");
      setNotes(`Scanned barcode ${barcode} · Open Food Facts (values per 100g)`);
      setOcrPhoto(null);
      setOcrPreview(null);
      setStage("review");
    } catch {
      setLookupError("Couldn't reach Open Food Facts — check your connection.");
      setStage("not-found");
    }
  }

  function startManual() {
    setProduct(null);
    setName(`Barcode ${code}`);
    setQuantity("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setNotes(`Barcode ${code} — not found in Open Food Facts, values entered manually`);
    setOcrPhoto(null);
    setOcrPreview(null);
    setStage("review");
  }

  async function handleLabelPhoto(file: File) {
    setStage("ocr-running");
    setOcrError(null);
    setOcrPhoto(file);
    const url = URL.createObjectURL(file);
    setOcrPreview(url);
    try {
      const T = await import("tesseract.js");
      const worker = await T.createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const parsed = parseNutritionText(data.text ?? "");
      if (!parsed.kcal && !parsed.protein && !parsed.carbs && !parsed.fat) {
        setOcrError("Couldn't read any nutrition values from that photo — try a clearer, straight-on shot, or enter the numbers manually.");
        setStage("not-found");
        return;
      }
      setName(`Barcode ${code}`);
      setQuantity("100 g (label values)");
      setKcal(parsed.kcal ? String(parsed.kcal) : "");
      setProtein(parsed.protein ? String(parsed.protein) : "");
      setCarbs(parsed.carbs ? String(parsed.carbs) : "");
      setFat(parsed.fat ? String(parsed.fat) : "");
      setNotes(`Barcode ${code} — nutrition read from label photo (OCR, please verify)`);
      setStage("ocr-review");
    } catch {
      setOcrError("OCR failed on that photo — try again or enter the numbers manually.");
      setStage("not-found");
    }
  }

  function handleAdd() {
    if (!name.trim()) return;
    onDone(
      {
        name: name.trim(),
        quantity: quantity.trim() || null,
        calories: num(kcal),
        protein_g: num(protein),
        carbs_g: num(carbs),
        fat_g: num(fat),
        notes: notes.trim() || null,
      },
      stage === "ocr-review" ? ocrPhoto : null
    );
  }

  if (!open) return null;

  const reviewing = stage === "review" || stage === "ocr-review";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">📷 Scan product</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm"
          >
            ✕
          </button>
        </div>

        {stage === "scanning" && (
          <div>
            <div className="overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
            </div>
            <p className="mt-2 text-center text-sm text-gray-500">
              Point the camera at the barcode — it scans automatically.
            </p>
            {camError && (
              <div className="mt-3">
                <p className="text-sm text-red-600">{camError}</p>
                <button
                  onClick={startCamera}
                  className="mt-2 w-full rounded-xl bg-gray-900 py-3 font-semibold text-white"
                >
                  Try camera again
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "looking-up" && (
          <p className="py-10 text-center text-sm text-gray-500">
            Looking up barcode {code} in Open Food Facts…
          </p>
        )}

        {stage === "not-found" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Barcode <span className="font-mono font-semibold">{code}</span> isn't in Open Food Facts.
            </p>
            {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
            {ocrError && <p className="text-sm text-red-600">{ocrError}</p>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLabelPhoto(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white"
            >
              📸 Scan the nutrition facts label
            </button>
            <button
              onClick={startManual}
              className="w-full rounded-xl border border-gray-300 py-3 font-semibold text-gray-700"
            >
              ⌨️ Enter values manually
            </button>
          </div>
        )}

        {stage === "ocr-running" && (
          <div className="py-8 text-center">
            {ocrPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ocrPreview} alt="Nutrition label" className="mx-auto mb-4 h-40 rounded-xl object-cover" />
            )}
            <p className="text-sm text-gray-500">Reading the nutrition label…</p>
          </div>
        )}

        {reviewing && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {product
                ? "Found in Open Food Facts — values are per 100g. Adjust the serving and numbers before saving."
                : stage === "ocr-review"
                  ? "Values read from your label photo — verify each number before saving."
                  : "Manual entry — fill in what the label says."}
            </p>
            {stage === "ocr-review" && ocrPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ocrPreview} alt="Nutrition label" className="h-40 w-full rounded-xl object-cover" />
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
            />
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Serving (e.g. 1 bar, 30g)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
            />
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["kcal", "Calories (kcal)", kcal, setKcal],
                  ["protein", "Protein (g)", protein, setProtein],
                  ["carbs", "Carbs (g)", carbs, setCarbs],
                  ["fat", "Fat (g)", fat, setFat],
                ] as const
              ).map(([k, label, v, setV]) => (
                <label key={k} className="block">
                  <span className="text-xs font-medium text-gray-500">{label}</span>
                  <input
                    type="number" inputMode="decimal" value={v}
                    onChange={(e) => setV(e.target.value)} placeholder="0"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={handleAdd}
              disabled={!name.trim()}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              Review & add to {MEAL_LABELS[mealType]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
