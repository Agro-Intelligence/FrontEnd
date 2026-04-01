"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { AgroTechHeroIllustration } from "@/components/AgroTechHeroIllustration";

const HedgeEditorialPortal = dynamic(
  () => import("@/components/HedgeEditorialPortal"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg text-brand-dark font-brand">
        <div className="reveal active rounded-md border border-stone-300 bg-white px-8 py-6 text-sm shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
             Carregando Monitor de Risco TimacAgro...
          </div>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (entered) return;
    // Ao voltar do monitor a landing remonta: precisamos reativar .reveal (senão ficam opacity:0 até F5)
    const timer = setTimeout(() => {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("active"));
      document.querySelectorAll(".text-reveal-wrapper").forEach((el) => el.classList.add("reveal-active"));
    }, 100);
    return () => clearTimeout(timer);
  }, [entered]);

  if (entered) {
    return <HedgeEditorialPortal onGoHome={() => setEntered(false)} />;
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-dark font-brand overflow-hidden relative">
      {/* Grid Guide from Digital Architect */}
      <div className="grid-guide">
        <div className="hidden md:block md:col-span-3 grid-guide-col"></div>
        <div className="hidden md:block md:col-span-6 grid-guide-col"></div>
        <div className="hidden md:block md:col-span-3 h-full"></div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col border-x border-stone-300 bg-brand-bg">
        {/* Header — Digital Architect (nav mono + sticky surface) */}
        <header className="sticky top-0 z-50 border-b border-stone-300 bg-brand-bg [isolation:isolate]">
          <div className="flex items-center justify-between px-4 py-5 md:px-6">
            <div className="flex items-center gap-6">
              <span className="text-xs font-medium uppercase tracking-widest text-stone-600">
                Monitor de Risco
              </span>
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2">
              <span className="logo-timac-on-bege">
                <img src="/logo-timac.png" alt="Timac AGRO" />
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="rounded-full border border-stone-300 px-3 py-1 font-mono text-xs uppercase text-stone-600">
                v2.0.0
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section - Digital Architect Layout */}
        <section className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300 flex-1">
          
          {/* Left Content */}
          <div className="col-span-1 md:col-span-9 border-r border-stone-300 p-8 md:p-16 flex flex-col justify-center relative overflow-hidden group">
            {/* Ilustração vetorial minimalista (Digital Architect style) */}
            <div className="pointer-events-none absolute inset-0 z-0">
              <AgroTechHeroIllustration className="h-full w-full" />
              {/* Scrim sutil para manter foco no conteúdo central */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-brand-bg/40 via-transparent to-brand-bg/10"
                aria-hidden
              />
            </div>
            <div className="absolute top-0 right-0 z-[1] w-64 h-64 bg-brand-light-green/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10">
              <div className="reveal delay-100">
                <span className="rounded-full border border-stone-300 bg-white/80 px-3 py-1 font-mono text-xs uppercase tracking-widest text-stone-600">
                  Inteligência de Mercado & Risco
                </span>
              </div>

              <h1 className="mt-8 text-5xl font-semibold leading-none tracking-tighter text-stone-900 md:text-8xl">
                <span className="reveal active">
                  Monitor de
                </span><br/>
                <span className="reveal active text-brand-blue">
                  Risco Agro
                </span>
              </h1>

              <p className="mt-10 max-w-2xl text-lg leading-relaxed text-stone-800 md:text-xl reveal delay-300">
                Transformamos dados complexos em insights estratégicos para a TimacAgro. 
                Hedge, clima e produção integrados em um ecossistema de decisão.
              </p>

              <div className="mt-12 flex flex-col gap-4 reveal delay-500 sm:flex-row">
                <button
                  onClick={() => setEntered(true)}
                  className="btn-timac btn-timac-primary group"
                >
                  Acessar Monitor
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right Stats/Info Sidebar */}
          <div className="col-span-1 md:col-span-3 grid grid-rows-3">
            <div className="p-8 border-b border-stone-300 flex flex-col justify-between hover:bg-white transition-colors group reveal delay-200">
              <div className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M16 5V3"/><path d="M8 5V3"/><path d="M3 9h18"/><path d="M15 19l2 2 4-4"/></svg>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-stone-600">Módulos Ativos</span>
                <h3 className="mt-1 text-5xl font-medium tracking-tighter">06</h3>
              </div>
            </div>

            <div className="p-8 border-b border-stone-300 flex flex-col justify-between hover:bg-white transition-colors group reveal delay-400">
              <div className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-stone-600">Status de Risco</span>
                <h3 className="mt-1 text-5xl font-medium tracking-tighter text-brand-green">OK</h3>
              </div>
            </div>

            <div className="p-8 flex flex-col justify-between hover:bg-white transition-colors group reveal delay-600">
              <div className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-stone-600">Última Atualização</span>
                <h3 className="text-lg font-bold tracking-tight mt-1">Hoje, 09:41</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-stone-300 bg-stone-900 p-6 text-stone-200 md:flex-row">
          <p className="font-mono text-xs uppercase tracking-widest text-stone-500">
            © 2026 TIMAC AGRO BRASIL • MONITOR DE RISCO E INTELIGÊNCIA
          </p>
          <div className="flex gap-6">
            <span className="cursor-pointer text-xs font-medium uppercase tracking-widest text-stone-300 transition-colors hover:text-white">
              Hedge
            </span>
            <span className="cursor-pointer text-xs font-medium uppercase tracking-widest text-stone-300 transition-colors hover:text-white">
              Clima
            </span>
            <span className="cursor-pointer text-xs font-medium uppercase tracking-widest text-stone-300 transition-colors hover:text-white">
              Produção
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
