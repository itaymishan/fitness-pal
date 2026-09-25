"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/data";
import type { Profile } from "@/lib/types";

export default function SettingsClient() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [targets, setTargets] = useState({
    calorie_target: "2200",
    protein_target_g: "150",
    carb_target_g: "250",
    fat_target_g: "70",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const p: Profile = await getProfile(supabase, user.id);
      setTargets({
        calorie_target: String(p.calorie_target),
        protein_target_g: String(p.protein_target_g),
        carb_target_g: String(p.carb_target_g),
        fat_target_g: String(p.fat_target_g),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    const payload = {
      id: userId,
      calorie_target: parseInt(targets.calorie_target) || 0,
      protein_target_g: parseInt(targets.protein_target_g) || 0,
      carb_target_g: parseInt(targets.carb_target_g) || 0,
      fat_target_g: parseInt(targets.fat_target_g) || 0,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const fields = [
    ["calorie_target", "Daily calories (kcal)"],
    ["protein_target_g", "Protein (g)"],
    ["carb_target_g", "Carbs (g)"],
    ["fat_target_g", "Fat (g)"],
  ] as const;

  return (
    <main className="px-4 pt-4">
      <div className="mx-auto w-full max-w-xl">
      <h1 className="text-xl font-bold">⚙️ Settings</h1>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Daily targets</h2>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                value={targets[key]}
                onChange={(e) => setTargets((t) => ({ ...t, [key]: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </label>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save targets"}
        </button>
      </section>

      <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="break-words text-sm text-gray-500">
          Signed in as <span className="font-medium text-gray-800">{email}</span>
        </div>
        <button
          onClick={signOut}
          className="mt-3 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700"
        >
          Sign out
        </button>
      </section>
      </div>
    </main>
  );
}
