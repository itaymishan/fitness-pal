import { Suspense } from "react";
import DiaryClient from "@/components/DiaryClient";

export const dynamic = "force-dynamic";

export default function DiaryPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading…</div>}>
      <DiaryClient />
    </Suspense>
  );
}
