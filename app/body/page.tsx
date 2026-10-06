import { Suspense } from "react";
import BodyClient from "@/components/BodyClient";

export const dynamic = "force-dynamic";

export default function BodyPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading…</div>}>
      <BodyClient />
    </Suspense>
  );
}
