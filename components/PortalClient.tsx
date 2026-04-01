"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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
        <div className="min-h-screen bg-brand-bg px-4 py-10 text-brand-stone-600 md:px-6 lg:px-8 font-brand">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6 shadow-2xl reveal active">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-600">
              Falha ao abrir a plataforma
            </p>
            <h1 className="mt-3 text-2xl font-bold text-brand-dark">
              O portal encontrou um erro de renderização.
            </h1>
            <p className="mt-4 text-sm leading-6 text-brand-stone-600">
              {this.state.message}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, message: "" });
                  this.props.onReset();
                }}
                className="rounded-2xl border border-brand-blue bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
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
      <div className="min-h-screen bg-brand-bg text-brand-stone-600 font-brand">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-brand-stone-300 bg-white px-8 py-6 text-sm text-brand-stone-600 shadow-xl reveal active">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
              <span>Inicializando ambiente...</span>
            </div>
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
    <div className="flex min-h-screen flex-col bg-brand-bg font-brand">
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl text-center reveal active">
          <div className="mb-12 flex justify-center">
            <span className="logo-timac-on-bege logo-timac-on-bege-lg">
              <img src="/logo-timac.png" alt="Timac AGRO" />
            </span>
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tighter text-brand-dark md:text-7xl">
            Monitor de <span className="text-brand-blue">Risco Agro</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-brand-stone-600">
            Plataforma avançada de inteligência quantitativa para monitoramento de mercados, 
            clima e produção agrícola.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={goPortal}
              className="group flex items-center gap-3 rounded-2xl border border-brand-blue bg-brand-blue px-8 py-4 text-lg font-bold text-white shadow-xl transition hover:opacity-90"
            >
              Acessar Monitor
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 