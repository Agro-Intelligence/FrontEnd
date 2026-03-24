"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const HedgeEditorialPortal = dynamic(
  () => import("@/components/HedgeEditorialPortal"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm shadow-xl">
          Carregando Agro Intelligence Engine...
        </div>
      </div>
    ),
  }
);

export default function Page() {
  const [entered, setEntered] = useState(false);

  if (entered) {
    return <HedgeEditorialPortal onGoHome={() => setEntered(false)} />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.10),_transparent_24%),linear-gradient(to_bottom,_#020617,_#0f172a,_#000000)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10 lg:px-12">
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/80">
              Plataforma Analítica
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Agro Intelligence Engine
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Inteligência aplicada ao agro para mercado, clima, produção e
              tomada de decisão.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
              V1 privada
            </span>
            <span className="rounded-full border border-emerald-800/70 bg-emerald-950/40 px-4 py-2 text-xs font-semibold text-emerald-300">
              Hedge • Clima • Produção • Inteligência de Mercado
            </span>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Ambiente
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              Plataforma privada operacional
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Núcleo de dados
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              CEPEA • B3 • Agroclima • Produção
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Foco atual
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">
              Basis, forecast e radar analítico
            </p>
          </div>
        </section>

        <section className="flex flex-1 items-center py-10 md:py-14">
          <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs text-slate-300 shadow-lg backdrop-blur">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Ambiente estratégico em operação
              </div>

              <h2 className="mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl xl:text-6xl">
                Inteligência aplicada ao agro para transformar
                <span className="text-emerald-400"> dados</span> em
                <span className="text-sky-400"> decisão</span>
              </h2>

              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                Uma plataforma consultiva para análise de commodities, hedge,
                basis porto versus interior, risco agroclimático, produção
                agrícola, sinais editoriais e inteligência territorial.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setEntered(true)}
                  className="rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
                >
                  Entrar na Plataforma
                </button>

                <a
                  href="#visao-geral"
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/70"
                >
                  Ver visão geral
                </a>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Núcleo de Mercado
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-100">
                    Forecast, compare de modelos, estratégia e backtest robusto.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Inteligência Territorial
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-100">
                    Monitoramento municipal, risco agroclimático e mapas
                    analíticos.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Produção Agrícola
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-100">
                    Leitura integrada de dados históricos, safras e sinais
                    operacionais.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.18),_transparent_30%)]" />

                <div className="relative">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Overview
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-white">
                        Cockpit Estratégico
                      </h3>
                    </div>

                    <div className="rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-1 text-xs font-semibold text-sky-300">
                      Private
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Horizonte analítico
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">
                        Commodities, hedge, clima, produção, sentimento de
                        mercado e inteligência editorial em uma visão única.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-700/70 bg-emerald-950/20 p-4 shadow-lg">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">
                          Terminal Snapshot
                        </p>

                        <div className="rounded-full border border-emerald-800 bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Monitoramento ativo
                        </div>
                      </div>

                      <div className="h-40 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                        <svg
                          viewBox="0 0 520 160"
                          className="h-full w-full"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <linearGradient
                              id="heroLine"
                              x1="0"
                              y1="0"
                              x2="1"
                              y2="0"
                            >
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="60%" stopColor="#22c55e" />
                              <stop offset="100%" stopColor="#a3e635" />
                            </linearGradient>
                          </defs>

                          <path
                            d="M0,125 C40,120 55,105 85,102 C125,98 140,112 175,90 C215,66 235,78 270,68 C310,56 335,44 370,52 C405,60 430,28 465,24 C490,21 505,14 520,10"
                            fill="none"
                            stroke="url(#heroLine)"
                            strokeWidth="4"
                            strokeLinecap="round"
                          >
                            <animate
                              attributeName="d"
                              dur="5s"
                              repeatCount="indefinite"
                              values="
                                M0,125 C40,120 55,105 85,102 C125,98 140,112 175,90 C215,66 235,78 270,68 C310,56 335,44 370,52 C405,60 430,28 465,24 C490,21 505,14 520,10;
                                M0,130 C35,118 60,112 90,108 C120,104 150,95 182,88 C215,81 240,72 276,63 C308,55 336,59 372,43 C408,28 432,34 468,20 C492,12 507,15 520,8;
                                M0,125 C40,120 55,105 85,102 C125,98 140,112 175,90 C215,66 235,78 270,68 C310,56 335,44 370,52 C405,60 430,28 465,24 C490,21 505,14 520,10
                              "
                            />
                          </path>
                        </svg>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            Regime
                          </p>
                          <p className="mt-1 text-sm font-semibold text-emerald-300">
                            Tendência
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            Sinal
                          </p>
                          <p className="mt-1 text-sm font-semibold text-sky-300">
                            Analítico
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            Status
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">
                            Ativo
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Mercado
                        </p>
                        <p className="mt-2 text-lg font-semibold text-emerald-300">
                          Forecast
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Séries contínuas e estratégia
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Território
                        </p>
                        <p className="mt-2 text-lg font-semibold text-sky-300">
                          Mapa
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Leitura municipal e risco
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Proposta de valor
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-200">
                        <li>• Consolidação de sinais dispersos em uma visão única</li>
                        <li>• Apoio consultivo para decisão e monitoramento</li>
                        <li>• Estrutura pronta para evoluir para ambiente corporativo</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="visao-geral"
          className="grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-8 md:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Mercado e Hedge
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Modelos quantitativos, séries futuras, recomendação estratégica e
              leitura de sentimento.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Agroclima e Território
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Monitoramento territorial por município com visão espacial e
              suporte à leitura de risco.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Produção e Inteligência
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Integração entre estatísticas agrícolas, dados operacionais e
              interpretação analítica para consultoria.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}