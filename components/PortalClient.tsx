"use client";

import React, { useEffect, useState } from "react";
import HedgeEditorialPortal from "@/components/HedgeEditorialPortal";

type ViewMode = "home" | "portal";

class PortalErrorBoundary extends React.Component<
  { onReset: () => void; children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { onReset: () => void; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error?.message || "Falha ao renderizar o portal.",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Portal render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black px-4 py-10 text-slate-100 md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-900/70 bg-red-950/20 p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300/80">
              Falha ao abrir a plataforma
            </p>
            <h1 className="mt-3 text-2xl font-bold text-white">
              O portal encontrou um erro de renderização.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              {this.state.message}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, message: "" });
                  this.props.onReset();
                }}
                className="rounded-2xl border border-emerald-700 bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Voltar à entrada
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function PortalClient() {
  const [currentView, setCurrentView] = useState<ViewMode>("home");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryView = params.get("view");
    const storedView = window.localStorage.getItem("aie_current_view");

    if (queryView === "portal" || storedView === "portal") {
      setCurrentView("portal");
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const params = new URLSearchParams(window.location.search);

    if (currentView === "portal") {
      params.set("view", "portal");
      window.localStorage.setItem("aie_current_view", "portal");
    } else {
      params.delete("view");
      window.localStorage.setItem("aie_current_view", "home");
    }

    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;

    window.history.replaceState({}, "", nextUrl);
  }, [currentView, isReady]);

  function goPortal() {
    setCurrentView("portal");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function goHome() {
    setCurrentView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 text-sm text-slate-300 shadow-xl">
            Carregando ambiente...
          </div>
        </div>
      </div>
    );
  }

  if (currentView === "portal") {
    return (
      <PortalErrorBoundary onReset={goHome}>
        <HedgeEditorialPortal onGoHome={goHome} />
      </PortalErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-10 md:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400/80">
              Agro Intelligence Engine
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Terminal analítico agro
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Plataforma analítica privada para monitoramento de mercado futuro,
              basis porto versus interior, sentimento, backtest, forecast,
              produção agrícola e risco agroclimático.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={goPortal}
                className="rounded-2xl border border-emerald-700 bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Entrar na Plataforma
              </button>

              <span className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                V1 privada
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Mercado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  Forecast + Backtest
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Modelos comparativos, estratégia sugerida e leitura quantitativa
                  para commodities monitoradas.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Basis
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  Porto vs Interior
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Monitoramento do diferencial da soja com MA30, classificação e
                  radar de arbitragem.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Clima
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  Mapa agroclimático
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Visualização territorial com leitura de risco municipal e apoio
                  à decisão.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Produção
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  Painel agrícola
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Visão integrada de produção, contexto agrícola e inteligência
                  operacional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 