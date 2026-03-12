"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import AgroProductionPanel from "@/components/AgroProductionPanel";

const MunicipalRiskMap = dynamic(
  () => import("@/components/MunicipalRiskMap"),
  { ssr: false }
);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const SILVER = "#C9CED6";
const FORECAST_GREEN = "#22C55E";

type PortalTab = "mercado" | "mapa" | "producao";

type AssetItem = {
  symbol: string;
  name: string;
  file?: string;
};

type AssetsResponse = {
  assets: AssetItem[];
};

type ContinuousResponse = {
  symbol: string;
  name: string;
  dates: string[];
  settlement: number[];
  volume: (number | null)[];
  open_interest: (number | null)[];
};

type CompareRankingItem = {
  model: string;
  rmse: number;
  mae: number;
  mape: number;
  directional_accuracy: number;
  bias: number;
};

type CompareResponse = {
  symbol: string;
  asset_name: string;
  horizon: number;
  ranking: CompareRankingItem[];
  best_model: string;
  insight: string;
  failures?: { model: string; error: string }[];
};

type ForecastResponse = {
  symbol: string;
  asset_name: string;
  model: string;
  horizon: number;
  history: {
    dates: string[];
    settlement: number[];
  };
  forecast: {
    values: number[];
  };
  metrics: {
    history_last: number;
    forecast_mean: number;
    forecast_min: number;
    forecast_max: number;
  };
  insight: string;
};

type StrategyResponse = {
  symbol: string;
  asset_name: string;
  best_model: string;
  signal: string;
  recommended_strategy: string;
  confidence: number;
  metrics: {
    model?: string;
    rmse?: number;
    mae?: number;
    mape?: number;
    directional_accuracy?: number;
    bias?: number;
  };
  insight: string;
};

type BacktestRankingItem = {
  model: string;
  family: string;
  rmse: number;
  mae: number;
  mape: number;
  directional_accuracy: number;
  bias: number;
  folds: number;
};

type BacktestResponse = {
  symbol: string;
  n_obs: number;
  horizon: number;
  train_min_size: number;
  step: number;
  total_folds: number;
  valid_models: number;
  best_model_rmse: string;
  best_model_directional: string;
  ranking_rmse: BacktestRankingItem[];
  ranking_directional: BacktestRankingItem[];
  insight: string;
  debug: Record<string, string[]>;
};

type SentimentResponse = {
  symbol: string;
  asset_name: string;
  sentiment_score: number;
  sentiment_label: string;
  headline_count: number;
  top_topics: string[];
  editorial_summary: string;
  latest_headlines: string[];
  source: string;
};

type SeriesPoint = {
  date: string;
  settlement: number;
  volume: number | null;
  open_interest: number | null;
};

type ForecastPoint = {
  label: string;
  history: number | null;
  forecast: number | null;
};

function formatModelName(model: string): string {
  return model
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSignalName(signal?: string): string {
  if (!signal) return "-";

  const map: Record<string, string> = {
    bullish: "Viés altista",
    bearish: "Viés baixista",
    neutral_range: "Faixa neutra",
  };

  return map[signal] || signal.replaceAll("_", " ");
}

function formatStrategyName(strategy?: string): string {
  if (!strategy) return "-";

  const map: Record<string, string> = {
    wait_or_light_hedge: "Aguardar ou fazer hedge leve",
    protective_put_or_partial_short_hedge:
      "Proteção com put ou hedge parcial de venda",
    short_hedge_or_put_spread:
      "Hedge de venda ou estrutura com put spread",
  };

  return map[strategy] || strategy.replaceAll("_", " ");
}

function getSignalBadge(signal?: string): string {
  switch (signal) {
    case "bullish":
      return "bg-emerald-950/70 text-emerald-300 border-emerald-800";
    case "bearish":
      return "bg-red-950/70 text-red-300 border-red-800";
    case "neutral_range":
    default:
      return "bg-amber-950/70 text-amber-300 border-amber-800";
  }
}

function getSentimentBadge(label?: string): string {
  switch (label) {
    case "bullish":
      return "bg-emerald-950/70 text-emerald-300 border-emerald-800";
    case "bearish":
      return "bg-red-950/70 text-red-300 border-red-800";
    default:
      return "bg-amber-950/70 text-amber-300 border-amber-800";
  }
}

function getAssetDisplayName(symbol: string, fallback?: string): string {
  const map: Record<string, string> = {
    BGI: "Boi Gordo",
    CCM: "Milho",
    ICF: "Café Arábica",
    SJC: "Soja",
    ETH: "Etanol Hidratado",
    CNL: "Café Conilon",
  };

  const cleanSymbol = (symbol || "").trim().toUpperCase();
  const cleanFallback = (fallback || "").trim();

  if (
    cleanFallback &&
    cleanFallback.toUpperCase() !== cleanSymbol &&
    cleanFallback !== "-"
  ) {
    return cleanFallback;
  }

  return map[cleanSymbol] || cleanSymbol;
}

function formatNumber(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getSafeYDomain(
  values: Array<number | null | undefined>,
  padRatio = 0.08
): [number, number] | ["auto", "auto"] {
  const nums = values.filter(
    (v): v is number =>
      v !== null && v !== undefined && Number.isFinite(v) && !Number.isNaN(v)
  );

  if (!nums.length) return ["auto", "auto"];

  const min = Math.min(...nums);
  const max = Math.max(...nums);

  if (min === max) {
    const pad = Math.abs(min || 1) * 0.05;
    return [min - pad, max + pad];
  }

  const range = max - min;
  const pad = range * padRatio;

  return [min - pad, max + pad];
}

function makeForecastChartData(
  forecast: ForecastResponse | null
): ForecastPoint[] {
  if (!forecast) return [];

  const historyDates = Array.isArray(forecast.history?.dates)
    ? forecast.history.dates
    : [];
  const historyValues = Array.isArray(forecast.history?.settlement)
    ? forecast.history.settlement
    : [];
  const forecastValues = Array.isArray(forecast.forecast?.values)
    ? forecast.forecast.values
    : [];
  const horizon = Number(forecast.horizon ?? forecastValues.length ?? 0);

  const historyTailSize = Math.min(20, historyValues.length);
  const tailStart = Math.max(0, historyValues.length - historyTailSize);

  const data: ForecastPoint[] = [];

  for (let i = tailStart; i < historyValues.length; i++) {
    const histValue = historyValues[i];
    data.push({
      label: historyDates[i] ?? `H${i}`,
      history: Number.isFinite(histValue) ? histValue : null,
      forecast:
        i === historyValues.length - 1 && Number.isFinite(histValue)
          ? histValue
          : null,
    });
  }

  for (let j = 0; j < horizon; j++) {
    const fcstValue = forecastValues[j];
    data.push({
      label: `F+${j + 1}`,
      history: null,
      forecast: Number.isFinite(fcstValue) ? fcstValue : null,
    });
  }

  return data;
}

function chartTooltipStyle() {
  return {
    contentStyle: {
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      color: "#f8fafc",
      borderRadius: "14px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    },
    labelStyle: { color: "#f8fafc" },
  };
}

export default function HedgeEditorialPortal() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ICF");
  const [activeTab, setActiveTab] = useState<PortalTab>("mercado");

  const [continuous, setContinuous] = useState<ContinuousResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);

  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [compareHorizon] = useState<number>(10);
  const [backtestHorizon] = useState<number>(5);
  const [backtestTrainMin] = useState<number>(30);
  const [backtestStep] = useState<number>(2);

  async function fetchAssets() {
    const res = await fetch(`${API_BASE_URL}/assets`);
    if (!res.ok) {
      throw new Error("Erro ao carregar lista de ativos.");
    }
    const data: AssetsResponse = await res.json();
    setAssets(data.assets || []);

    if (!selectedSymbol && data.assets?.length > 0) {
      setSelectedSymbol(data.assets[0].symbol);
    }
  }

  async function fetchContinuous(symbol: string) {
    const res = await fetch(`${API_BASE_URL}/assets/${symbol}/continuous`);
    if (!res.ok) {
      throw new Error(`Erro ao carregar série contínua para ${symbol}.`);
    }
    const data: ContinuousResponse = await res.json();
    setContinuous(data);
  }

  async function fetchCompare(symbol: string) {
    const res = await fetch(`${API_BASE_URL}/forecast/compare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol, horizon: compareHorizon }),
    });

    if (!res.ok) {
      throw new Error(`Erro ao carregar compare para ${symbol}.`);
    }

    const data: CompareResponse = await res.json();
    setCompare(data);
    return data;
  }

  async function fetchForecast(symbol: string, model: string) {
    const res = await fetch(`${API_BASE_URL}/forecast/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol, model, horizon: compareHorizon }),
    });

    if (!res.ok) {
      throw new Error(`Erro ao carregar forecast para ${symbol}.`);
    }

    const raw = await res.json();

    const data: ForecastResponse = {
      ...raw,
      history: {
        dates: Array.isArray(raw?.history?.dates) ? raw.history.dates : [],
        settlement: Array.isArray(raw?.history?.settlement)
          ? raw.history.settlement
          : [],
      },
      forecast: {
        values: Array.isArray(raw?.forecast?.values) ? raw.forecast.values : [],
      },
    };

    setForecast(data);
  }

  async function fetchStrategy(symbol: string) {
    const res = await fetch(`${API_BASE_URL}/strategy/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol, horizon: compareHorizon }),
    });

    if (!res.ok) {
      throw new Error(`Erro ao carregar estratégia para ${symbol}.`);
    }

    const data: StrategyResponse = await res.json();
    setStrategy(data);
  }

  async function fetchBacktest(symbol: string) {
    setLoadingBacktest(true);
    try {
      const res = await fetch(`${API_BASE_URL}/backtest/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          horizon: backtestHorizon,
          train_min_size: backtestTrainMin,
          step: backtestStep,
          models: ["holt_winters", "arima", "sarima", "ewma", "moving_average"],
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro ao carregar backtest para ${symbol}.`);
      }

      const data: BacktestResponse = await res.json();
      setBacktest(data);
    } catch (error) {
      console.error(error);
      setBacktest(null);
    } finally {
      setLoadingBacktest(false);
    }
  }

  async function fetchSentiment(symbol: string) {
    const res = await fetch(`${API_BASE_URL}/sentiment/${symbol}`);
    if (!res.ok) {
      throw new Error(`Erro ao carregar sentimento para ${symbol}.`);
    }

    const data: SentimentResponse = await res.json();
    setSentiment(data);
  }

  async function loadDashboard(symbol: string) {
    try {
      setLoadingMain(true);
      setPageError(null);
      setBacktest(null);

      const compareData = await fetchCompare(symbol);
      const bestModel = compareData?.best_model || "arima";

      await Promise.all([
        fetchContinuous(symbol),
        fetchForecast(symbol, bestModel),
        fetchStrategy(symbol),
        fetchSentiment(symbol),
      ]);

      fetchBacktest(symbol);
    } catch (error) {
      console.error(error);
      setPageError("Não foi possível carregar os dados do portal.");
    } finally {
      setLoadingMain(false);
    }
  }

  useEffect(() => {
    fetchAssets().catch((error) => {
      console.error(error);
      setPageError("Não foi possível carregar os ativos.");
    });
  }, []);

  useEffect(() => {
    if (!selectedSymbol) return;
    loadDashboard(selectedSymbol);
  }, [selectedSymbol]);

  const seriesData: SeriesPoint[] = useMemo(() => {
    if (!continuous) return [];

    return continuous.dates
      .map((date, index) => ({
        date,
        settlement: continuous.settlement[index],
        volume: continuous.volume[index] ?? null,
        open_interest: continuous.open_interest[index] ?? null,
      }))
      .filter(
        (item) =>
          item.date &&
          item.settlement !== null &&
          item.settlement !== undefined &&
          Number.isFinite(item.settlement)
      );
  }, [continuous]);

  const continuousYDomain = useMemo(() => {
    return getSafeYDomain(seriesData.map((d) => d.settlement), 0.1);
  }, [seriesData]);

  const continuousSummary = useMemo(() => {
    if (!continuous || continuous.settlement.length === 0) return null;

    const valid = continuous.settlement.filter(
      (v) => v !== null && v !== undefined && Number.isFinite(v)
    );

    if (!valid.length) return null;

    const first = valid[0];
    const last = valid[valid.length - 1];
    const pct = first !== 0 ? ((last / first) - 1) * 100 : 0;

    return { first, last, pct };
  }, [continuous]);

  const compareChartData = useMemo(() => {
    if (!compare?.ranking) return [];
    return compare.ranking.slice(0, 6).map((item) => ({
      model: formatModelName(item.model),
      rmse: item.rmse,
    }));
  }, [compare]);

  const forecastChartData = useMemo(() => {
    return makeForecastChartData(forecast);
  }, [forecast]);

  const forecastYDomain = useMemo(() => {
    return getSafeYDomain(
      forecastChartData.flatMap((item) => [item.history, item.forecast]),
      0.1
    );
  }, [forecastChartData]);

  const backtestRmseChartData = useMemo(() => {
    if (!backtest?.ranking_rmse) return [];
    return backtest.ranking_rmse.slice(0, 5).map((item) => ({
      model: formatModelName(item.model),
      rmse: item.rmse,
    }));
  }, [backtest]);

  const backtestDirectionalChartData = useMemo(() => {
    if (!backtest?.ranking_directional) return [];
    return backtest.ranking_directional.slice(0, 5).map((item) => ({
      model: formatModelName(item.model),
      directional_accuracy: item.directional_accuracy,
    }));
  }, [backtest]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
                Monitoramento Analítico
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
                Monitoramento de Risco Agro
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Portal analítico com séries contínuas, forecast, comparação de
                modelos, estratégia, backtest robusto, sentimento de mercado e
                monitoramento territorial com mapa municipal.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("mercado")}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "mercado"
                ? "border-emerald-700 bg-emerald-950/60 text-emerald-300"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            Mercado Futuro
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mapa")}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "mapa"
                ? "border-sky-700 bg-sky-950/60 text-sky-300"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            Mapa Agroclimático
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("producao")}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "producao"
                ? "border-fuchsia-700 bg-fuchsia-950/60 text-fuchsia-300"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            Produção Agrícola
          </button>
        </div>

        {pageError && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {pageError}
          </div>
        )}

        {loadingMain && activeTab === "mercado" && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300 shadow-sm backdrop-blur">
            Carregando núcleo principal do portal...
          </div>
        )}

        {activeTab === "mercado" && (
          <>
            <div className="mb-6 rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                    Aba Mercado Futuro
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-100">
                    Seleção de Ativo
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Escolha o ativo para atualizar as análises quantitativas,
                    modelos, estratégia, sentimento e backtest.
                  </p>
                </div>

                <div className="flex w-full max-w-md flex-col gap-2">
                  <label className="text-sm font-medium text-slate-300">
                    Ativo
                  </label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
                  >
                    {assets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} -{" "}
                        {getAssetDisplayName(asset.symbol, asset.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-4 xl:col-span-8">
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100">
                        Série Contínua —{" "}
                        {getAssetDisplayName(
                          continuous?.symbol ?? selectedSymbol,
                          continuous?.name
                        )}
                      </h2>
                      <p className="text-sm text-slate-400">
                        Histórico de settlement do ativo selecionado.
                      </p>

                      {continuousSummary && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200">
                            Início: {formatNumber(continuousSummary.first)}
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200">
                            Fim: {formatNumber(continuousSummary.last)}
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200">
                            Variação: {formatNumber(continuousSummary.pct, 2)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {continuous && (
                      <div className="text-sm text-slate-400">
                        Observações:{" "}
                        <span className="font-semibold text-slate-100">
                          {continuous.settlement.length}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={seriesData}>
                        <defs>
                          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="0%"
                              stopColor={SILVER}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor={SILVER}
                              stopOpacity={0.03}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "#cbd5e1" }}
                          minTickGap={24}
                        />
                        <YAxis
                          domain={continuousYDomain}
                          tick={{ fontSize: 11, fill: "#cbd5e1" }}
                          tickFormatter={(value) =>
                            formatNumber(Number(value), 2)
                          }
                        />
                        <Tooltip {...chartTooltipStyle()} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="settlement"
                          name="Preço"
                          stroke={SILVER}
                          fill="url(#priceFill)"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100">
                        Forecast
                      </h2>
                      <p className="text-sm text-slate-400">
                        Histórico recente + projeção com o melhor modelo do
                        compare.
                      </p>
                    </div>

                    {forecast && (
                      <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                        Modelo: {formatModelName(forecast.model)}
                      </div>
                    )}
                  </div>

                  <div className="mb-5 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecastChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#cbd5e1" }}
                          minTickGap={20}
                        />
                        <YAxis
                          domain={forecastYDomain}
                          tick={{ fontSize: 11, fill: "#cbd5e1" }}
                          tickFormatter={(value) =>
                            formatNumber(Number(value), 2)
                          }
                        />
                        <Tooltip {...chartTooltipStyle()} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="history"
                          name="Histórico"
                          stroke={SILVER}
                          strokeWidth={2.5}
                          dot={false}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          name="Forecast"
                          stroke={FORECAST_GREEN}
                          strokeWidth={2.5}
                          strokeDasharray="6 4"
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {forecast && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Último preço
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatNumber(forecast.metrics.history_last)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Média prevista
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatNumber(forecast.metrics.forecast_mean)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Mínimo previsto
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatNumber(forecast.metrics.forecast_min)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Máximo previsto
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatNumber(forecast.metrics.forecast_max)}
                        </p>
                      </div>
                    </div>
                  )}

                  {forecast?.insight && (
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-800/70 p-3 text-sm leading-6 text-slate-300">
                      {forecast.insight}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100">
                        Ranking de Modelos
                      </h2>
                      <p className="text-sm text-slate-400">
                        Compare com horizonte{" "}
                        {compare?.horizon ?? compareHorizon}.
                      </p>
                    </div>

                    {compare && (
                      <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                        Best model: {formatModelName(compare.best_model)}
                      </div>
                    )}
                  </div>

                  <div className="mb-5 h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={compareChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="model"
                          tick={{ fontSize: 11, fill: "#cbd5e1" }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#cbd5e1" }} />
                        <Tooltip {...chartTooltipStyle()} />
                        <Legend />
                        <Bar
                          dataKey="rmse"
                          name="RMSE"
                          fill="#60a5fa"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {compare?.insight && (
                    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-800/70 p-3 text-sm leading-6 text-slate-300">
                      {compare.insight}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-slate-400">
                          <th className="py-2 pr-3">Modelo</th>
                          <th className="py-2 pr-3">RMSE</th>
                          <th className="py-2 pr-3">MAE</th>
                          <th className="py-2 pr-3">MAPE</th>
                          <th className="py-2 pr-3">Dir. Acc.</th>
                          <th className="py-2 pr-3">Bias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compare?.ranking?.map((item) => (
                          <tr
                            key={item.model}
                            className="border-b border-slate-800 last:border-0"
                          >
                            <td className="py-2 pr-3 font-medium text-slate-100">
                              {formatModelName(item.model)}
                            </td>
                            <td className="py-2 pr-3 text-slate-300">
                              {formatNumber(item.rmse)}
                            </td>
                            <td className="py-2 pr-3 text-slate-300">
                              {formatNumber(item.mae)}
                            </td>
                            <td className="py-2 pr-3 text-slate-300">
                              {formatNumber(item.mape)}%
                            </td>
                            <td className="py-2 pr-3 text-slate-300">
                              {formatNumber(item.directional_accuracy, 1)}%
                            </td>
                            <td className="py-2 pr-3 text-slate-300">
                              {formatNumber(item.bias)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-4 xl:col-span-4">
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-100">
                      Estratégia
                    </h2>
                    {strategy && (
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSignalBadge(
                          strategy.signal
                        )}`}
                      >
                        {formatSignalName(strategy.signal)}
                      </span>
                    )}
                  </div>

                  {strategy ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Melhor modelo
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">
                            {formatModelName(strategy.best_model)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Confiança
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">
                            {formatNumber(strategy.confidence * 100, 1)}%
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Estratégia sugerida
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatStrategyName(strategy.recommended_strategy)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Insight
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                          {strategy.insight}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            RMSE
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">
                            {formatNumber(strategy.metrics?.rmse)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Directional Acc.
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">
                            {formatNumber(
                              strategy.metrics?.directional_accuracy,
                              1
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Nenhuma estratégia carregada.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-100">
                      Sentimento
                    </h2>
                    {sentiment && (
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSentimentBadge(
                          sentiment.sentiment_label
                        )}`}
                      >
                        {sentiment.sentiment_label} |{" "}
                        {sentiment.sentiment_score.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {sentiment ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Resumo editorial
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                          {sentiment.editorial_summary}
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                          Tópicos no radar
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sentiment.top_topics.map((topic) => (
                            <span
                              key={topic}
                              className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs text-slate-300"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                          Manchetes monitoradas ({sentiment.headline_count})
                        </p>
                        <div className="space-y-2">
                          {sentiment.latest_headlines.map((headline, idx) => (
                            <div
                              key={`${idx}-${headline}`}
                              className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3 text-sm text-slate-300"
                            >
                              {headline}
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">
                        Fonte: {sentiment.source}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Nenhum dado de sentimento carregado.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-100">
                      Resumo Quantitativo
                    </h2>
                    <p className="text-sm text-slate-400">
                      Um retrato rápido do ativo selecionado.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Ativo
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {continuous?.symbol ?? selectedSymbol} —{" "}
                        {getAssetDisplayName(
                          continuous?.symbol ?? selectedSymbol,
                          continuous?.name
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Melhor modelo do compare
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {compare ? formatModelName(compare.best_model) : "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Melhor por RMSE no backtest
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {backtest
                          ? formatModelName(backtest.best_model_rmse)
                          : "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Melhor por direção no backtest
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {backtest
                          ? formatModelName(backtest.best_model_directional)
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">
                    Backtest Robusto
                  </h2>
                  <p className="text-sm text-slate-400">
                    Walk-forward validation com foco em erro e direção.
                  </p>
                </div>

                {loadingBacktest ? (
                  <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                    Carregando backtest...
                  </div>
                ) : backtest ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200">
                      Obs: {backtest.n_obs}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200">
                      Folds: {backtest.total_folds}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200">
                      Modelos válidos: {backtest.valid_models}
                    </span>
                  </div>
                ) : null}
              </div>

              {loadingBacktest && (
                <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
                  O backtest é carregado em segundo plano para não atrasar o
                  restante do portal.
                </div>
              )}

              {!loadingBacktest && backtest?.insight && (
                <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-800/70 p-3 text-sm leading-6 text-slate-300">
                  {backtest.insight}
                </div>
              )}

              {!loadingBacktest && backtest && (
                <>
                  <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Melhor por RMSE
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-100">
                        {formatModelName(backtest.best_model_rmse)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Melhor por Direção
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-100">
                        {formatModelName(backtest.best_model_directional)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Parâmetros
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        horizon={backtest.horizon}, train=
                        {backtest.train_min_size}, step={backtest.step}
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
                      <h3 className="mb-3 text-lg font-semibold text-slate-100">
                        RMSE
                      </h3>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={backtestRmseChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#334155"
                            />
                            <XAxis
                              dataKey="model"
                              tick={{ fontSize: 11, fill: "#cbd5e1" }}
                            />
                            <YAxis tick={{ fontSize: 11, fill: "#cbd5e1" }} />
                            <Tooltip {...chartTooltipStyle()} />
                            <Legend />
                            <Bar
                              dataKey="rmse"
                              name="RMSE"
                              fill="#14b8a6"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
                      <h3 className="mb-3 text-lg font-semibold text-slate-100">
                        Directional Accuracy
                      </h3>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={backtestDirectionalChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#334155"
                            />
                            <XAxis
                              dataKey="model"
                              tick={{ fontSize: 11, fill: "#cbd5e1" }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fontSize: 11, fill: "#cbd5e1" }}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip
                              {...chartTooltipStyle()}
                              formatter={(value: number | string) => [
                                `${formatNumber(Number(value), 1)}%`,
                                "Directional Accuracy",
                              ]}
                            />
                            <Legend />
                            <Bar
                              dataKey="directional_accuracy"
                              name="Directional Accuracy"
                              fill="#f59e0b"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-slate-100">
                        Ranking por RMSE
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700 text-left text-slate-400">
                              <th className="py-2 pr-3">Modelo</th>
                              <th className="py-2 pr-3">Família</th>
                              <th className="py-2 pr-3">RMSE</th>
                              <th className="py-2 pr-3">Dir. Acc.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {backtest.ranking_rmse.map((item) => (
                              <tr
                                key={`rmse-${item.model}`}
                                className="border-b border-slate-800 last:border-0"
                              >
                                <td className="py-2 pr-3 font-medium text-slate-100">
                                  {formatModelName(item.model)}
                                </td>
                                <td className="py-2 pr-3 text-slate-300">
                                  {item.family}
                                </td>
                                <td className="py-2 pr-3 text-slate-300">
                                  {formatNumber(item.rmse)}
                                </td>
                                <td className="py-2 pr-3 text-slate-300">
                                  {formatNumber(
                                    item.directional_accuracy,
                                    1
                                  )}
                                  %
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-slate-100">
                        Ranking por Direção
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700 text-left text-slate-400">
                              <th className="py-2 pr-3">Modelo</th>
                              <th className="py-2 pr-3">Família</th>
                              <th className="py-2 pr-3">Dir. Acc.</th>
                              <th className="py-2 pr-3">RMSE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {backtest.ranking_directional.map((item) => (
                              <tr
                                key={`dir-${item.model}`}
                                className="border-b border-slate-800 last:border-0"
                              >
                                <td className="py-2 pr-3 font-medium text-slate-100">
                                  {formatModelName(item.model)}
                                </td>
                                <td className="py-2 pr-3 text-slate-300">
                                  {item.family}
                                </td>
                                <td className="py-2 pr-3 text-slate-300">
                                  {formatNumber(
                                    item.directional_accuracy,
                                    1
                                  )}
                                  %
                                </td>
                                <td className="py-2 pr-3 text-slate-300">
                                  {formatNumber(item.rmse)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === "mapa" && <MunicipalRiskMap />}
        {activeTab === "producao" && <AgroProductionPanel />}
      </div>
    </div>
  );
}