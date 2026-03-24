"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import MacroCreditoAgroPanel from "@/components/MacroCreditoAgroPanel";

const MunicipalRiskMap = dynamic(
  () => import("@/components/MunicipalRiskMap"),
  { ssr: false }
);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const SILVER = "#C9CED6";
const FORECAST_GREEN = "#22C55E";
const MA30_ORANGE = "#F59E0B";

type PortalTab = "mercado" | "macro" | "mapa" | "producao";

type HedgeEditorialPortalProps = {
  onGoHome?: () => void;
};

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

type SoySpreadLatestResponse = {
  spread: string;
  date: string | null;
  spot_port_brl: number | null;
  spot_interior_brl: number | null;
  spread_logistico_brl: number | null;
  spread_logistico_pct: number | null;
};

type SoySpreadSeriesItem = {
  date: string;
  spot_port_brl: number | null;
  spot_interior_brl: number | null;
  spread_logistico_brl: number | null;
  spread_logistico_pct: number | null;
  source?: string | null;
  created_at?: string | null;
};

type SoySpreadSeriesResponse = {
  spread: string;
  location_port: string;
  location_interior: string;
  points_count: number;
  items: SoySpreadSeriesItem[];
};

type CepeaUpdateStatusResponse = {
  started_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  message?: string | null;
  raw_dir?: string | null;
  spot_prices_file?: string | null;
  spot_spreads_file?: string | null;
  steps?: string[];
  spot_prices_rows?: number | null;
  spot_spreads_rows?: number | null;
  spot_prices_symbols?: string[];
  last_spot_date?: string | null;
  last_spread_date?: string | null;
};

type MacroRegimeContribution = {
  factor: string;
  signal: string;
  impact: number;
};

type MacroRegimeLatestItem = {
  value: number | null;
  date: string | null;
  delta_abs?: number | null;
  delta_pct?: number | null;
};

type MacroRegimeResponse = {
  start: string;
  end: string;
  ipca_reference_year: string;
  regime: {
    label: string;
    badge: string;
    score: number;
    summary: string;
    signals: {
      selic_level: string;
      ipca_signal: string;
      usd_direction: string;
      inadimplencia_direction: string;
    };
    contributions: MacroRegimeContribution[];
    latest: {
      selic: MacroRegimeLatestItem;
      usd: MacroRegimeLatestItem;
      ipca_expectation: MacroRegimeLatestItem;
      inadimplencia_rural_media: MacroRegimeLatestItem;
    };
  };
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

type SpreadChartPoint = {
  date: string;
  spread_logistico_brl: number | null;
  spread_logistico_pct: number | null;
  ma30_brl: number | null;
};

type ArbitrageSignal = {
  spreadAtual: number;
  ma30: number;
  desvio: number;
  desvioPct: number;
  min: number;
  max: number;
  mean: number;
  classification: "BARATO" | "NEUTRO" | "CARO";
  insight: string;
};

type BasisClassification = {
  label: "Aberto" | "Normal" | "Comprimido" | "Sem leitura";
  badge: string;
  text: string;
  desvioPct: number | null;
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

function getUpdateStatusBadge(status?: string | null): string {
  switch (status) {
    case "ok":
      return "bg-emerald-950/70 text-emerald-300 border-emerald-800";
    case "error":
      return "bg-red-950/70 text-red-300 border-red-800";
    case "never_run":
      return "bg-amber-950/70 text-amber-300 border-amber-800";
    default:
      return "bg-slate-800/80 text-slate-300 border-slate-700";
  }
}

function formatUpdateStatusLabel(status?: string | null): string {
  switch (status) {
    case "ok":
      return "Atualizado";
    case "error":
      return "Erro";
    case "never_run":
      return "Nunca executado";
    case "invalid_status_file":
      return "Status inválido";
    default:
      return "Sem status";
  }
}

function getB3StatusBadge(hasData: boolean): string {
  return hasData
    ? "bg-sky-950/70 text-sky-300 border-sky-800"
    : "bg-slate-800/80 text-slate-300 border-slate-700";
}

function getB3StatusLabel(hasData: boolean): string {
  return hasData ? "B3 carregado" : "Sem dados B3";
}

function getMacroRegimeBadgeClass(badge?: string): string {
  switch (badge) {
    case "restrictive":
      return "bg-red-950/70 text-red-300 border-red-800";
    case "pro_export":
      return "bg-emerald-950/70 text-emerald-300 border-emerald-800";
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
    SJP: "Soja Paraná",
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

function formatPercent(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function formatShortDate(value?: string | null): string {
  if (!value) return "-";

  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatDateOnly(value?: string | null): string {
  if (!value) return "-";

  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("pt-BR");
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

function getSpreadSignal(
  spreadPct?: number | null
): { label: string; badge: string; text: string } {
  if (
    spreadPct === null ||
    spreadPct === undefined ||
    Number.isNaN(spreadPct)
  ) {
    return {
      label: "Sem leitura",
      badge: "bg-slate-800/80 text-slate-300 border-slate-700",
      text: "Ainda sem leitura confiável do diferencial porto versus interior.",
    };
  }

  if (spreadPct >= 0.06) {
    return {
      label: "Spread elevado",
      badge: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
      text: "Diferencial relativamente amplo entre porto e interior, sugerindo prêmio logístico/exportador mais forte.",
    };
  }

  if (spreadPct >= 0.03) {
    return {
      label: "Spread moderado",
      badge: "bg-amber-950/70 text-amber-300 border-amber-800",
      text: "Diferencial positivo e saudável entre porto e interior, sem sinal de compressão extrema.",
    };
  }

  return {
    label: "Spread comprimido",
    badge: "bg-rose-950/70 text-rose-300 border-rose-800",
    text: "Diferencial mais apertado entre porto e interior, sugerindo compressão logística ou menor prêmio exportador.",
  };
}

function getBasisClassification(
  current?: number | null,
  ma30?: number | null
): BasisClassification {
  if (
    current === null ||
    current === undefined ||
    Number.isNaN(current) ||
    ma30 === null ||
    ma30 === undefined ||
    Number.isNaN(ma30) ||
    ma30 === 0
  ) {
    return {
      label: "Sem leitura",
      badge: "bg-slate-800/80 text-slate-300 border-slate-700",
      text: "Ainda não há base suficiente para classificar o basis porto versus interior.",
      desvioPct: null,
    };
  }

  const desvioPct = (current - ma30) / ma30;

  if (desvioPct >= 0.08) {
    return {
      label: "Aberto",
      badge: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
      text: "O basis está acima da média móvel de 30 dias, sugerindo abertura do diferencial porto versus interior.",
      desvioPct,
    };
  }

  if (desvioPct <= -0.08) {
    return {
      label: "Comprimido",
      badge: "bg-rose-950/70 text-rose-300 border-rose-800",
      text: "O basis está abaixo da média móvel de 30 dias, sinalizando compressão do diferencial porto versus interior.",
      desvioPct,
    };
  }

  return {
    label: "Normal",
    badge: "bg-amber-950/70 text-amber-300 border-amber-800",
    text: "O basis está próximo da média móvel recente, sem descolamento relevante no diferencial porto versus interior.",
    desvioPct,
  };
}

function buildArbitrageSignal(
  series: SpreadChartPoint[]
): ArbitrageSignal | null {
  if (!series || series.length < 30) return null;

  const spreads = series
    .map((d) => d.spread_logistico_brl)
    .filter(
      (v): v is number => v !== null && v !== undefined && Number.isFinite(v)
    );

  if (spreads.length < 30) return null;

  const spreadAtual = spreads[spreads.length - 1];
  const last30 = spreads.slice(-30);
  const ma30 = last30.reduce((acc, v) => acc + v, 0) / last30.length;
  const desvio = spreadAtual - ma30;
  const desvioPct = ma30 !== 0 ? desvio / ma30 : 0;
  const min = Math.min(...spreads);
  const max = Math.max(...spreads);
  const mean = spreads.reduce((acc, v) => acc + v, 0) / spreads.length;

  let classification: ArbitrageSignal["classification"] = "NEUTRO";
  let insight = "Spread dentro da normalidade histórica.";

  if (desvioPct <= -0.1) {
    classification = "BARATO";
    insight =
      "Spread abaixo da média histórica — possível compressão logística e oportunidade relativa no basis porto versus interior.";
  } else if (desvioPct >= 0.1) {
    classification = "CARO";
    insight =
      "Spread acima da média histórica — possível distorção logística e abertura relevante frente ao padrão recente.";
  }

  return {
    spreadAtual,
    ma30,
    desvio,
    desvioPct,
    min,
    max,
    mean,
    classification,
    insight,
  };
}

function getArbitrageBadge(signal: ArbitrageSignal | null): string {
  if (!signal) {
    return "bg-slate-800/80 text-slate-300 border-slate-700";
  }

  if (signal.classification === "BARATO") {
    return "bg-emerald-950/70 text-emerald-300 border-emerald-800";
  }

  if (signal.classification === "CARO") {
    return "bg-red-950/70 text-red-300 border-red-800";
  }

  return "bg-amber-950/70 text-amber-300 border-amber-800";
}

export default function HedgeEditorialPortal({
  onGoHome,
}: HedgeEditorialPortalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ICF");
  const [activeTab, setActiveTab] = useState<PortalTab>("mercado");

  const [continuous, setContinuous] = useState<ContinuousResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [soySpreadLatest, setSoySpreadLatest] =
    useState<SoySpreadLatestResponse | null>(null);
  const [soySpreadSeries, setSoySpreadSeries] =
    useState<SoySpreadSeriesResponse | null>(null);
  const [cepeaStatus, setCepeaStatus] =
    useState<CepeaUpdateStatusResponse | null>(null);
  const [macroRegime, setMacroRegime] =
    useState<MacroRegimeResponse | null>(null);

  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [loadingCepeaStatus, setLoadingCepeaStatus] = useState(false);
  const [updatingCepea, setUpdatingCepea] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [cepeaActionMessage, setCepeaActionMessage] = useState<string | null>(
    null
  );

  const [compareHorizon] = useState<number>(10);
  const [backtestHorizon] = useState<number>(5);
  const [backtestTrainMin] = useState<number>(30);
  const [backtestStep] = useState<number>(2);

  function handleGoHome() {
    if (typeof onGoHome === "function") {
      onGoHome();
      return;
    }

    setActiveTab("mercado");

    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/");
  }

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

  async function fetchSoySpreadLatest() {
    const res = await fetch(`${API_BASE_URL}/spot-spreads/soy/latest`);
    if (!res.ok) {
      throw new Error("Erro ao carregar spread logístico da soja.");
    }

    const data: SoySpreadLatestResponse = await res.json();
    setSoySpreadLatest(data);
  }

  async function fetchSoySpreadSeries() {
    const res = await fetch(`${API_BASE_URL}/spot-spreads/soy`);
    if (!res.ok) {
      throw new Error("Erro ao carregar histórico do spread logístico da soja.");
    }

    const data: SoySpreadSeriesResponse = await res.json();
    setSoySpreadSeries(data);
  }

  async function fetchCepeaStatus() {
    setLoadingCepeaStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/update/cepea/status`);
      if (!res.ok) {
        throw new Error("Erro ao carregar status da atualização CEPEA.");
      }
      const data: CepeaUpdateStatusResponse = await res.json();
      setCepeaStatus(data);
      return data;
    } catch (error) {
      console.error(error);
      setCepeaStatus(null);
      return null;
    } finally {
      setLoadingCepeaStatus(false);
    }
  }

  async function fetchMacroRegime() {
    try {
      const res = await fetch(`${API_BASE_URL}/macro-credito-agro/regime`);
      if (!res.ok) {
        throw new Error("Erro ao carregar indicador de regime macro.");
      }
      const data: MacroRegimeResponse = await res.json();
      setMacroRegime(data);
      return data;
    } catch (error) {
      console.error(error);
      setMacroRegime(null);
      return null;
    }
  }

  async function handleUpdateCepea() {
    try {
      setUpdatingCepea(true);
      setCepeaActionMessage(null);

      const res = await fetch(`${API_BASE_URL}/admin/update/cepea`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || data?.status !== "ok") {
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : data?.message || "Falha ao atualizar CEPEA.";
        throw new Error(detail);
      }

      setCepeaActionMessage("Atualização CEPEA concluída com sucesso.");
      setCepeaStatus(data);

      await Promise.all([
        fetchSoySpreadLatest(),
        fetchSoySpreadSeries(),
        fetchCepeaStatus(),
      ]);

      if (selectedSymbol) {
        await loadDashboard(selectedSymbol);
      }
    } catch (error) {
      console.error(error);
      setCepeaActionMessage(
        error instanceof Error
          ? error.message
          : "Falha ao atualizar CEPEA."
      );
      await fetchCepeaStatus();
    } finally {
      setUpdatingCepea(false);
    }
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
        fetchSoySpreadLatest(),
        fetchSoySpreadSeries(),
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

    fetchCepeaStatus().catch((error) => {
      console.error(error);
    });

    fetchMacroRegime().catch((error) => {
      console.error(error);
    });
  }, []);

  useEffect(() => {
    if (!selectedSymbol) return;
    loadDashboard(selectedSymbol);
  }, [selectedSymbol]);

  const seriesData: SeriesPoint[] = useMemo(() => {
    const dates = Array.isArray(continuous?.dates) ? continuous?.dates : [];
    const settlements = Array.isArray(continuous?.settlement)
      ? continuous?.settlement
      : [];
    const volumes = Array.isArray(continuous?.volume) ? continuous?.volume : [];
    const openInterests = Array.isArray(continuous?.open_interest)
      ? continuous?.open_interest
      : [];

    return dates
      .map((date, index) => ({
        date,
        settlement: settlements[index],
        volume: volumes[index] ?? null,
        open_interest: openInterests[index] ?? null,
      }))
      .filter(
        (item) =>
          !!item.date &&
          item.settlement !== null &&
          item.settlement !== undefined &&
          Number.isFinite(item.settlement)
      ) as SeriesPoint[];
  }, [continuous]);

  const continuousYDomain = useMemo(() => {
    return getSafeYDomain(seriesData.map((d) => d.settlement), 0.1);
  }, [seriesData]);

  const continuousSummary = useMemo(() => {
    if (!seriesData.length) return null;

    const first = seriesData[0].settlement;
    const last = seriesData[seriesData.length - 1].settlement;
    const pct = first !== 0 ? (last / first - 1) * 100 : 0;

    return { first, last, pct };
  }, [seriesData]);

  const b3StatusSummary = useMemo(() => {
    if (!seriesData.length) {
      return {
        hasData: false,
        lastDate: null as string | null,
        rows: 0,
        lastSettlement: null as number | null,
      };
    }

    const lastPoint = seriesData[seriesData.length - 1];

    return {
      hasData: true,
      lastDate: lastPoint.date ?? null,
      rows: seriesData.length,
      lastSettlement: lastPoint.settlement ?? null,
    };
  }, [seriesData]);

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

  const soySpreadSignal = useMemo(() => {
    return getSpreadSignal(soySpreadLatest?.spread_logistico_pct);
  }, [soySpreadLatest]);

  const soySpreadChartData = useMemo<SpreadChartPoint[]>(() => {
    const items = Array.isArray(soySpreadSeries?.items)
      ? soySpreadSeries.items
      : [];

    const raw = items
      .map((item) => ({
        date: item.date,
        spread_logistico_brl: item.spread_logistico_brl ?? null,
        spread_logistico_pct: item.spread_logistico_pct ?? null,
      }))
      .filter(
        (item) =>
          !!item.date &&
          item.spread_logistico_brl !== null &&
          item.spread_logistico_brl !== undefined &&
          Number.isFinite(item.spread_logistico_brl)
      );

    return raw.map((item, idx, arr) => {
      const window = arr
        .slice(Math.max(0, idx - 29), idx + 1)
        .map((d) => d.spread_logistico_brl)
        .filter(
          (v): v is number =>
            v !== null && v !== undefined && Number.isFinite(v)
        );

      const ma30_brl = window.length
        ? window.reduce((acc, v) => acc + v, 0) / window.length
        : null;

      return {
        ...item,
        ma30_brl,
      };
    });
  }, [soySpreadSeries]);

  const soySpreadChartTail = useMemo(() => {
    if (!soySpreadChartData.length) return [];
    return soySpreadChartData.slice(-90);
  }, [soySpreadChartData]);

  const soySpreadYDomain = useMemo(() => {
    return getSafeYDomain(
      soySpreadChartTail.flatMap((d) => [d.spread_logistico_brl, d.ma30_brl]),
      0.12
    );
  }, [soySpreadChartTail]);

  const soySpreadSummary = useMemo(() => {
    if (!soySpreadChartTail.length) return null;

    const vals = soySpreadChartTail
      .map((d) => d.spread_logistico_brl)
      .filter(
        (v): v is number => v !== null && v !== undefined && Number.isFinite(v)
      );

    if (!vals.length) return null;

    return {
      last: vals[vals.length - 1],
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }, [soySpreadChartTail]);

  const soySpreadMa30Last = useMemo(() => {
    if (!soySpreadChartTail.length) return null;
    return soySpreadChartTail[soySpreadChartTail.length - 1]?.ma30_brl ?? null;
  }, [soySpreadChartTail]);

  const soyBasisClassification = useMemo(() => {
    return getBasisClassification(
      soySpreadLatest?.spread_logistico_brl,
      soySpreadMa30Last
    );
  }, [soySpreadLatest, soySpreadMa30Last]);

  const arbitrageSignal = useMemo(() => {
    return buildArbitrageSignal(soySpreadChartData);
  }, [soySpreadChartData]);

  const macroSignalPills = useMemo(() => {
    if (!macroRegime?.regime?.signals) return [];

    return [
      {
        label: "SELIC",
        value: macroRegime.regime.signals.selic_level,
      },
      {
        label: "IPCA",
        value: macroRegime.regime.signals.ipca_signal,
      },
      {
        label: "USD/BRL",
        value: macroRegime.regime.signals.usd_direction,
      },
      {
        label: "Inadimplência rural",
        value: macroRegime.regime.signals.inadimplencia_direction,
      },
    ];
  }, [macroRegime]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGoHome}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                ← Início
              </button>

              <button
                type="button"
                onClick={handleGoHome}
                className="text-left transition hover:opacity-90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400/80">
                  Agro Intelligence Engine
                </p>
                <h1 className="mt-1 text-lg font-bold tracking-tight text-white md:text-xl">
                  Terminal analítico agro
                </h1>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                V1 privada
              </span>
              <span className="rounded-full border border-emerald-800/70 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                Mercado • Macro • Clima • Produção
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
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
            onClick={() => setActiveTab("macro")}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "macro"
                ? "border-cyan-700 bg-cyan-950/60 text-cyan-300"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            Macro & Crédito Agro
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

        {macroRegime?.regime && (
          <div className="mb-6 rounded-3xl border border-slate-800/80 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-950/95 p-5 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  Leitura Executiva
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-slate-100">
                    Regime Macro Agro
                  </h2>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getMacroRegimeBadgeClass(
                      macroRegime.regime.badge
                    )}`}
                  >
                    {macroRegime.regime.label}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200">
                    Score: {macroRegime.regime.score}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {macroRegime.regime.summary}
                </p>
              </div>

              <div className="grid min-w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px] xl:max-w-[420px]">
                {macroSignalPills.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {macroRegime.regime.contributions.map((item, index) => (
                <div
                  key={`${item.factor}-${index}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                >
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    {item.factor}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {item.signal}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Impacto no score: {item.impact > 0 ? `+${item.impact}` : item.impact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm xl:col-span-7">
                <div className="flex flex-col gap-4">
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

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 md:p-5">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                          Status de Atualização
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-100">
                          Atualização B3
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Leitura operacional da série contínua do ativo
                          selecionado.
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getB3StatusBadge(
                          b3StatusSummary.hasData
                        )}`}
                      >
                        {getB3StatusLabel(b3StatusSummary.hasData)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Última data B3
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatDateOnly(b3StatusSummary.lastDate)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Ativo monitorado
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {selectedSymbol} -{" "}
                          {getAssetDisplayName(
                            continuous?.symbol ?? selectedSymbol,
                            continuous?.name
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Linhas da série
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatNumber(b3StatusSummary.rows, 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Último settlement
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatNumber(b3StatusSummary.lastSettlement)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Ativos disponíveis
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatNumber(assets.length, 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Situação
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {b3StatusSummary.hasData
                            ? "Série contínua carregada com sucesso."
                            : "Sem leitura disponível para o ativo selecionado."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm xl:col-span-5">
                <div className="flex h-full flex-col gap-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                        Operação de Dados
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-100">
                        Atualização CEPEA
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Reprocessa spot prices e basis da soja a partir dos
                        arquivos em{" "}
                        <span className="font-semibold">data/raw/cepea_spot</span>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUpdateCepea}
                      disabled={updatingCepea}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        updatingCepea
                          ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400"
                          : "border border-emerald-700 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      }`}
                    >
                      {updatingCepea ? "Atualizando..." : "Atualizar CEPEA"}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">
                        Executar rebuild CEPEA
                      </p>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getUpdateStatusBadge(
                          cepeaStatus?.status
                        )}`}
                      >
                        {loadingCepeaStatus
                          ? "Carregando..."
                          : formatUpdateStatusLabel(cepeaStatus?.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Status atual
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {loadingCepeaStatus
                            ? "Carregando..."
                            : formatUpdateStatusLabel(cepeaStatus?.status)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Última execução
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatDateTime(cepeaStatus?.updated_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Última data spot
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatDateOnly(cepeaStatus?.last_spot_date)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Último basis
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatDateOnly(cepeaStatus?.last_spread_date)}
                        </p>
                      </div>
                    </div>

                    {cepeaStatus?.spot_prices_symbols?.length ? (
                      <div className="mt-4">
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                          Símbolos processados
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {cepeaStatus.spot_prices_symbols.map((symbol) => (
                            <span
                              key={symbol}
                              className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300"
                            >
                              {symbol}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(cepeaActionMessage || cepeaStatus?.message) && (
                      <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-sm leading-6 text-slate-300">
                        {cepeaActionMessage || cepeaStatus?.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
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

                    <div className="text-sm text-slate-400">
                      Observações:{" "}
                      <span className="font-semibold text-slate-100">
                        {seriesData.length}
                      </span>
                    </div>
                  </div>

                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={seriesData}>
                        <defs>
                          <linearGradient
                            id="priceFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
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
                          tickFormatter={(value) =>
                            formatShortDate(String(value))
                          }
                        />
                        <YAxis
                          domain={continuousYDomain}
                          tick={{ fontSize: 11, fill: "#cbd5e1" }}
                          tickFormatter={(value) =>
                            formatNumber(Number(value), 2)
                          }
                        />
                        <Tooltip
                          {...chartTooltipStyle()}
                          labelFormatter={(label) =>
                            formatShortDate(String(label))
                          }
                        />
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
                          fill="#60A5FA"
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

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
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
                                  fill="#14B8A6"
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
                                  fill="#F59E0B"
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
              </div>

              <div className="space-y-6 xl:col-span-4">
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

                <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300/80">
                        Módulo Basis
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-100">
                        Basis Interior vs Porto
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Leitura executiva do diferencial da soja entre Paranaguá
                        e interior do Paraná.
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${soyBasisClassification.badge}`}
                    >
                      {soyBasisClassification.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Porto
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-100">
                        {formatNumber(soySpreadLatest?.spot_port_brl)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Paranaguá</p>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Interior
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-100">
                        {formatNumber(soySpreadLatest?.spot_interior_brl)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Paraná</p>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Basis
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-100">
                        {formatNumber(soySpreadLatest?.spread_logistico_brl)}{" "}
                        <span className="text-sm font-medium text-slate-400">
                          R$/saca
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Última referência: {formatDateOnly(soySpreadLatest?.date)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Basis %
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-100">
                        {formatPercent(soySpreadLatest?.spread_logistico_pct)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        vs nível spot do interior
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${soyBasisClassification.badge}`}
                      >
                        {soyBasisClassification.label}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                        MA30: {formatNumber(soySpreadMa30Last)} R$/saca
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                        Desvio: {formatPercent(soyBasisClassification.desvioPct)}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-slate-300">
                      {soyBasisClassification.text}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100">
                        Histórico do Basis
                      </h2>
                      <p className="text-sm text-slate-400">
                        Evolução do diferencial porto vs interior com média
                        móvel de 30 dias.
                      </p>
                    </div>

                    {soySpreadSummary && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200">
                          Último: {formatNumber(soySpreadSummary.last)} R$/saca
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200">
                          Mín: {formatNumber(soySpreadSummary.min)} R$/saca
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200">
                          Máx: {formatNumber(soySpreadSummary.max)} R$/saca
                        </span>
                      </div>
                    )}
                  </div>

                  {soySpreadChartTail.length ? (
                    <div className="h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={soySpreadChartTail}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#334155"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#cbd5e1" }}
                            minTickGap={24}
                            tickFormatter={(value) =>
                              formatShortDate(String(value))
                            }
                          />
                          <YAxis
                            domain={soySpreadYDomain}
                            tick={{ fontSize: 11, fill: "#cbd5e1" }}
                            tickFormatter={(value) =>
                              formatNumber(Number(value), 2)
                            }
                          />
                          <Tooltip
                            {...chartTooltipStyle()}
                            labelFormatter={(label) =>
                              formatShortDate(String(label))
                            }
                            formatter={(
                              value: number | string,
                              name: string
                            ) => {
                              if (
                                String(name) === "Basis" ||
                                String(name) === "spread_logistico_brl"
                              ) {
                                return [
                                  `${formatNumber(Number(value), 2)} R$/saca`,
                                  "Basis",
                                ];
                              }
                              if (
                                String(name) === "MA30" ||
                                String(name) === "ma30_brl"
                              ) {
                                return [
                                  `${formatNumber(Number(value), 2)} R$/saca`,
                                  "MA30",
                                ];
                              }
                              return [formatNumber(Number(value), 2), String(name)];
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="spread_logistico_brl"
                            name="Basis"
                            stroke="#22C55E"
                            strokeWidth={2.5}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="ma30_brl"
                            name="MA30"
                            stroke={MA30_ORANGE}
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Nenhum histórico de basis carregado.
                    </p>
                  )}

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300/80">
                          Radar de Arbitragem
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-100">
                          Basis Porto vs Interior
                        </h3>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getArbitrageBadge(
                          arbitrageSignal
                        )}`}
                      >
                        {arbitrageSignal?.classification ?? "Sem leitura"}
                      </span>
                    </div>

                    {arbitrageSignal ? (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Basis Atual
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {formatNumber(arbitrageSignal.spreadAtual)} R$/saca
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              MA30
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {formatNumber(arbitrageSignal.ma30)} R$/saca
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Desvio vs MA30
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {formatPercent(arbitrageSignal.desvioPct)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Mín histórico
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {formatNumber(arbitrageSignal.min)} R$/saca
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Média histórica
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {formatNumber(arbitrageSignal.mean)} R$/saca
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Máx histórico
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {formatNumber(arbitrageSignal.max)} R$/saca
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Leitura operacional
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {arbitrageSignal.insight}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                        Dados insuficientes para cálculo do radar de arbitragem.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100">
                        Sentimento
                      </h2>
                      <p className="text-sm text-slate-400">
                        Radar editorial e leitura qualitativa do ativo.
                      </p>
                    </div>

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

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Classificação do basis
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {soyBasisClassification.label}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Radar de arbitragem
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {arbitrageSignal?.classification ?? "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "macro" && <MacroCreditoAgroPanel />}
        {activeTab === "mapa" && <MunicipalRiskMap />}
        {activeTab === "producao" && <AgroProductionPanel />}
      </div>
    </div>
  );
}