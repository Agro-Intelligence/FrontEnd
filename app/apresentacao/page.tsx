"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import HedgeEditorialPortal, {
  type PortalTab,
} from "@/components/HedgeEditorialPortal";

const VALID_TABS = new Set<PortalTab>([
  "mercado",
  "macro",
  "mapa",
  "producao",
  "custos",
]);

function ApresentacaoInner() {
  const searchParams = useSearchParams();
  const initialTab = useMemo((): PortalTab => {
    const raw = searchParams.get("tab");
    if (raw && VALID_TABS.has(raw as PortalTab)) {
      return raw as PortalTab;
    }
    return "mercado";
  }, [searchParams]);

  return (
    <HedgeEditorialPortal presentationMode initialTab={initialTab} />
  );
}

export default function ApresentacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm shadow-xl">
            Carregando modo apresentação...
          </div>
        </div>
      }
    >
      <ApresentacaoInner />
    </Suspense>
  );
}
