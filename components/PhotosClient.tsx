"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAllPhotos, getSignedUrls, type PhotoEntry } from "@/lib/data";
import { MEAL_LABELS, type MealType } from "@/lib/types";
import { prettyDate } from "@/lib/utils";

export default function PhotosClient() {
  const supabase = createClient();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const all = await getAllPhotos(supabase, user.id);
      setPhotos(all);
      setUrls(await getSignedUrls(supabase, all.map((p) => p.path)));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDate = new Map<string, PhotoEntry[]>();
  for (const p of photos) {
    const list = byDate.get(p.date) ?? [];
    list.push(p);
    byDate.set(p.date, list);
  }

  return (
    <main className="px-4 pt-4">
      <h1 className="text-xl font-bold">📷 Meal photos</h1>
      <p className="mt-1 text-sm text-gray-500">A visual log of everything you've photographed.</p>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : photos.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No photos yet. Add one from any meal entry with the 📷 button.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {[...byDate.entries()]
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([date, entries]) => (
              <section key={date}>
                <Link
                  href={`/diary?date=${date}`}
                  className="mb-2 block text-sm font-bold text-gray-700"
                >
                  {prettyDate(date)} →
                </Link>
                <div className="grid grid-cols-3 gap-2">
                  {entries.map((p, i) =>
                    urls.get(p.path) ? (
                      <Link
                        key={`${p.path}-${i}`}
                        href={`/diary?date=${p.date}`}
                        className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
                        title={`${p.itemName} — ${MEAL_LABELS[p.mealType as MealType]}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={urls.get(p.path)!}
                          alt={p.itemName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </Link>
                    ) : null
                  )}
                </div>
              </section>
            ))}
        </div>
      )}
    </main>
  );
}
