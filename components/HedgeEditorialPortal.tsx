"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatNetworkFetchError, getApiBaseUrl } from "@/lib/api-base";
import AgroProductionPanel from "@/components/AgroProductionPanel";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const AgroClimaPanel = dynamic(() => import("@/components/AgroClimaPanel"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-stone-300 bg-white p-4 text-xs text-brand-stone-600 shadow-sm flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
      Carregando painel agroclimático...
    </div>
  ),
});

const MacroCreditoAgroPanel = dynamic(
  () => import("@/components/MacroCreditoAgroPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-stone-300 bg-white p-4 text-xs text-brand-stone-600 shadow-sm flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        Carregando painel macro & crédito...
      </div>
    ),
  }
);

// Import estático: o UI do mapa atualiza no mesmo chunk do portal (evita chunk lazy antigo em cache).
import MunicipalRiskMap from "@/components/MunicipalRiskMap";

const ForwardCurvesPanel = dynamic(
  () => import("@/components/ForwardCurvesPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-xs text-brand-stone-600 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        Carregando curvas a termo...
      </div>
    ),
  }
);

const CustosPerformancePanel = dynamic(
  () => import("@/components/CustosPerformancePanel"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-stone-300 bg-white p-4 text-xs text-brand-stone-600 shadow-sm flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        Carregando custos &amp; performance…
      </div>
    ),
  }
);

const API_BASE_URL = getApiBaseUrl();
const CEPEA_STATUS_REFRESH_MS = 30 * 1000;

const SILVER = "#C9CED6";
const FORECAST_GREEN = "#22C55E";
const MA30_ORANGE = "#F59E0B";

export type PortalTab = "mercado" | "macro" | "mapa" | "producao" | "custos";

const PORTAL_TABS: PortalTab[] = [
  "mercado",
  "macro",
  "mapa",
  "producao",
  "custos",
];

export function isPortalTab(value: string | null | undefined): value is PortalTab {
  return PORTAL_TABS.includes((value ?? "") as PortalTab);
}

type HedgeEditorialPortalProps = {
  onGoHome?: () => void;
  /** Aba inicial (ex.: URL ?tab=macro). */
  initialTab?: PortalTab;
  /** Rota `/apresentacao`: mesmo portal com aba inicial via query. */
  presentationMode?: boolean;
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
    conf_20_upper?: number[];
    conf_20_lower?: number[];
    conf_30_upper?: number[];
    conf_30_lower?: number[];
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

type ForwardCurveItem = {
  symbol: string;
  asset_name: string;
  reference_date: string;
  maturity_code: string;
  maturity_date: string;
  days_to_expiry: number;
  settlement: number;
  spot?: number | null;
  price_basis?: string | null;
  premium_vs_spot?: number | null;
  premium_pct_vs_spot?: number | null;
  annualized_basis?: number | null;
};

type ForwardCurveResponse = {
  symbol: string;
  asset_name: string;
  reference_date: string | null;
  points_count: number;
  has_spot: boolean;
  curve_shape_label?: string | null;
  items: ForwardCurveItem[];
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
  last_basis_label?: string | null;
  sync_label?: string | null;
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
  /**
   * Faixa nativa Recharts (isRange): [inferior, superior]. Evita Area empilhada a partir de 0
   * (artefato de linha vertical até o eixo).
   */
  ic30?: [number, number] | null;
  ic20?: [number, number] | null;
  /** Limites explícitos para linhas tracejadas e tooltip. */
  ci20_low?: number | null;
  ci20_high?: number | null;
  ci30_low?: number | null;
  ci30_high?: number | null;
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
      return "bg-emerald-50 text-emerald-700";
    case "bearish":
      return "bg-red-50 text-red-700";
    case "neutral_range":
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function getSentimentBadge(label?: string): string {
  switch (label) {
    case "bullish":
      return "bg-emerald-50 text-emerald-700";
    case "bearish":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function getUpdateStatusBadge(status?: string | null): string {
  switch (status) {
    case "ok":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "error":
      return "bg-red-50 text-red-700 border-red-200";
    case "never_run":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-stone-100/50 text-brand-stone-600 border-stone-300";
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

function getCepeaLastBasisLabel(
  cepeaStatus?: CepeaUpdateStatusResponse | null,
  soySpreadDate?: string | null
): string {
  if (cepeaStatus?.last_basis_label) return cepeaStatus.last_basis_label;
  const basisDate = cepeaStatus?.last_spread_date || soySpreadDate || null;
  if (basisDate) return formatDateOnly(basisDate);
  if (cepeaStatus?.status === "never_run") return "Sem histórico";
  return "-";
}

function getCepeaSyncLabel(
  cepeaStatus?: CepeaUpdateStatusResponse | null
): string {
  if (cepeaStatus?.sync_label) return cepeaStatus.sync_label;
  const syncAt = cepeaStatus?.updated_at || cepeaStatus?.started_at || null;
  if (syncAt) return formatDateTime(syncAt);
  if (cepeaStatus?.status === "never_run") return "Nunca sincronizado";
  return "-";
}

function getB3StatusBadge(hasData: boolean): string {
  return hasData
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : "bg-stone-100/50 text-brand-stone-600 border-stone-300";
}

function getB3StatusLabel(hasData: boolean): string {
  return hasData ? "B3 carregado" : "Sem dados B3";
}

function getMacroRegimeBadgeClass(badge?: string): string {
  switch (badge) {
    case "restrictive":
      return "bg-red-50 text-red-700";
    case "pro_export":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-amber-50 text-amber-700";
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

/** Referência B3: moeda, unidade de cotação e tamanho típico do contrato (painel). */
type AssetPriceSpec = {
  currencyCode: string;
  currencyLabel: string;
  quoteKind: string;
  quoteDetail: string;
  contractLot: string;
  exchange: string;
  /** Texto curto para eixos e valores */
  axisShort: string;
};

const DEFAULT_PRICE_SPEC: AssetPriceSpec = {
  currencyCode: "BRL",
  currencyLabel: "Real (BRL)",
  quoteKind: "Cotação",
  quoteDetail: "Unidade conforme contrato B3",
  contractLot: "—",
  exchange: "B3",
  axisShort: "",
};

const ASSET_PRICE_SPECS: Record<string, AssetPriceSpec> = {
  BGI: {
    currencyCode: "BRL",
    currencyLabel: "Real (BRL)",
    quoteKind: "R$ por arroba",
    quoteDetail: "1 @ = 15 kg de carcaça",
    contractLot: "330 arrobas",
    exchange: "B3",
    axisShort: "R$/@",
  },
  CCM: {
    currencyCode: "BRL",
    currencyLabel: "Real (BRL)",
    quoteKind: "R$ por saca",
    quoteDetail: "Saca de 60 kg",
    contractLot: "450 sacas",
    exchange: "B3",
    axisShort: "R$/saca 60 kg",
  },
  SJC: {
    currencyCode: "USD",
    currencyLabel: "Dólar (USD)",
    quoteKind: "US$ por saca",
    quoteDetail: "Saca de 60 kg",
    contractLot: "450 sacas",
    exchange: "B3",
    axisShort: "US$/saca 60 kg",
  },
  ICF: {
    currencyCode: "USD",
    currencyLabel: "Dólar (USD)",
    quoteKind: "US$ por saca",
    quoteDetail: "Saca de 60 kg (padrão negociação)",
    contractLot: "100 sacas",
    exchange: "B3",
    axisShort: "US$/saca 60 kg",
  },
  CNL: {
    currencyCode: "USD",
    currencyLabel: "Dólar (USD)",
    quoteKind: "US$ por saca",
    quoteDetail: "Saca de 60 kg",
    contractLot: "100 sacas",
    exchange: "B3",
    axisShort: "US$/saca 60 kg",
  },
  ETH: {
    currencyCode: "BRL",
    currencyLabel: "Real (BRL)",
    quoteKind: "R$ por m³",
    quoteDetail: "Etanol hidratado (referência de cotação)",
    contractLot: "Contrato em m³",
    exchange: "B3",
    axisShort: "R$/m³",
  },
};

function getAssetPriceSpec(symbol?: string | null): AssetPriceSpec {
  const s = (symbol || "").trim().toUpperCase();
  return ASSET_PRICE_SPECS[s] ?? DEFAULT_PRICE_SPEC;
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
  /** Índices de IC devem seguir o vetor de projeções (fonte de verdade). */
  const forecastSteps = forecastValues.length;

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
      ic20: null,
      ic30: null,
      ci20_low: null,
      ci20_high: null,
      ci30_low: null,
      ci30_high: null,
    });
  }

  for (let j = 0; j < forecastSteps; j++) {
    const fcstValue = forecastValues[j];
    const c20u = forecast.forecast.conf_20_upper?.[j];
    const c20l = forecast.forecast.conf_20_lower?.[j];
    const c30u = forecast.forecast.conf_30_upper?.[j];
    const c30l = forecast.forecast.conf_30_lower?.[j];

    const ok20 = Number.isFinite(c20l) && Number.isFinite(c20u);
    const ok30 = Number.isFinite(c30l) && Number.isFinite(c30u);
    const v20l = ok20 ? (c20l as number) : null;
    const v20u = ok20 ? (c20u as number) : null;
    const v30l = ok30 ? (c30l as number) : null;
    const v30u = ok30 ? (c30u as number) : null;

    data.push({
      label: `F+${j + 1}`,
      history: null,
      forecast: Number.isFinite(fcstValue) ? fcstValue : null,
      ci20_low: v20l,
      ci20_high: v20u,
      ci30_low: v30l,
      ci30_high: v30u,
      ic20: ok20 && v20l !== null && v20u !== null ? [v20l, v20u] : null,
      ic30: ok30 && v30l !== null && v30u !== null ? [v30l, v30u] : null,
    });
  }

  return data;
}

function chartTooltipStyle() {
  return {
    contentStyle: {
      backgroundColor: "#ffffff",
      border: "1px solid #d6d3d1",
      color: "#1c1917",
      borderRadius: "14px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    },
    labelStyle: { color: "#1c1917", fontWeight: "bold" },
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
      badge: "bg-stone-100/50 text-brand-stone-600 border-stone-300",
      text: "Ainda sem leitura confiável do diferencial porto versus interior.",
    };
  }

  if (spreadPct >= 0.06) {
    return {
      label: "Spread elevado",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      text: "Diferencial relativamente amplo entre porto e interior, sugerindo prêmio logístico/exportador mais forte.",
    };
  }

  if (spreadPct >= 0.03) {
    return {
      label: "Spread moderado",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      text: "Diferencial positivo e saudável entre porto e interior, sem sinal de compressão extrema.",
    };
  }

  return {
    label: "Spread comprimido",
    badge: "bg-red-50 text-red-700 border-red-200",
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
      badge: "bg-stone-100/50 text-brand-stone-600 border-stone-300",
      text: "Ainda não há base suficiente para classificar o basis porto versus interior.",
      desvioPct: null,
    };
  }

  const desvioPct = (current - ma30) / ma30;

  if (desvioPct >= 0.08) {
    return {
      label: "Aberto",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      text: "O basis está acima da média móvel de 30 dias, sugerindo abertura do diferencial porto versus interior.",
      desvioPct,
    };
  }

  if (desvioPct <= -0.08) {
    return {
      label: "Comprimido",
      badge: "bg-red-50 text-red-700 border-red-200",
      text: "O basis está abaixo da média móvel de 30 dias, sinalizando compressão do diferencial porto versus interior.",
      desvioPct,
    };
  }

  return {
    label: "Normal",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
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
    return "bg-stone-100/50 text-brand-stone-600 border-stone-300";
  }

  if (signal.classification === "BARATO") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (signal.classification === "CARO") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function HedgeEditorialPortal({
  onGoHome,
  initialTab = "mercado",
  presentationMode: _presentationMode,
}: HedgeEditorialPortalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ICF");
  const [activeTab, setActiveTab] = useState<PortalTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!pathname) return;

    const currentUrl = new URL(window.location.href);
    const currentTab = currentUrl.searchParams.get("tab");

    if (activeTab === "mercado") {
      if (!currentTab) return;
      currentUrl.searchParams.delete("tab");
    } else {
      if (currentTab === activeTab) return;
      currentUrl.searchParams.set("tab", activeTab);
    }

    router.replace(`${pathname}${currentUrl.search}`, { scroll: false });
  }, [activeTab, pathname, router]);

  const [continuous, setContinuous] = useState<ContinuousResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [forwardCurve, setForwardCurve] = useState<ForwardCurveResponse | null>(
    null
  );
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
  const [updatingCepea, setUpdatingCepea] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [cepeaActionMessage, setCepeaActionMessage] = useState<string | null>(
    null
  );

  const [mapSelectedUf, setMapSelectedUf] = useState<string>("RS");
  const [mapSelectedMunicipio, setMapSelectedMunicipio] =
    useState<string>("4304606");
  const [mapSelectedWindow, setMapSelectedWindow] = useState<1 | 3 | 6>(3);
  const [mapMunicipioSnapshot, setMapMunicipioSnapshot] = useState<any | null>(null);

  const [compareHorizon] = useState<number>(10);
  const [backtestHorizon] = useState<number>(5);
  const [backtestTrainMin] = useState<number>(30);
  const [backtestStep] = useState<number>(2);

  function handleTabChange(tab: PortalTab) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    const res = await fetch(`${API_BASE_URL}/assets`, { cache: "no-store" });
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
    const res = await fetch(`${API_BASE_URL}/assets/${symbol}/continuous`, { cache: "no-store" });
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
        conf_20_upper: Array.isArray(raw?.forecast?.conf_20_upper) ? raw.forecast.conf_20_upper : [],
        conf_20_lower: Array.isArray(raw?.forecast?.conf_20_lower) ? raw.forecast.conf_20_lower : [],
        conf_30_upper: Array.isArray(raw?.forecast?.conf_30_upper) ? raw.forecast.conf_30_upper : [],
        conf_30_lower: Array.isArray(raw?.forecast?.conf_30_lower) ? raw.forecast.conf_30_lower : [],
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
    const res = await fetch(`${API_BASE_URL}/sentiment/${symbol}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Erro ao carregar sentimento para ${symbol}.`);
    }

    const data: SentimentResponse = await res.json();
    setSentiment(data);
  }

  async function fetchForwardCurve(symbol: string) {
    const res = await fetch(`${API_BASE_URL}/forward-curves/${symbol}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Erro ao carregar curva forward para ${symbol}.`);
    }

    const data: ForwardCurveResponse = await res.json();
    setForwardCurve(data);
  }

  async function fetchSoySpreadLatest() {
    const res = await fetch(`${API_BASE_URL}/spot-spreads/soy/latest`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Erro ao carregar spread logístico da soja.");
    }

    const data: SoySpreadLatestResponse = await res.json();
    setSoySpreadLatest(data);
  }

  async function fetchSoySpreadSeries() {
    const res = await fetch(`${API_BASE_URL}/spot-spreads/soy`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Erro ao carregar histórico do spread logístico da soja.");
    }

    const data: SoySpreadSeriesResponse = await res.json();
    setSoySpreadSeries(data);
  }

  async function fetchCepeaStatus() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/update/cepea/status`, { cache: "no-store" });
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
    }
  }

  async function fetchMacroRegime() {
    try {
      const res = await fetch(`${API_BASE_URL}/macro-credito-agro/regime`, { cache: "no-store" });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.warn(
          "Macro regime indisponível no momento.",
          res.status,
          detail || "sem detalhe"
        );
        setMacroRegime(null);
        return null;
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
        headers: {
          "Content-Type": "application/json",
        },
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      const statusNorm = String(data?.status ?? "").toLowerCase();
      const cepeaSucceeded =
        statusNorm === "ok" || statusNorm === "ok_fallback_local_rebuild";

      if (!res.ok || !cepeaSucceeded) {
        const detail =
          (typeof data?.detail === "string" && data.detail) ||
          (typeof data?.message === "string" && data.message) ||
          `Falha ao atualizar CEPEA (HTTP ${res.status}).`;
        throw new Error(detail);
      }

      setCepeaActionMessage(
        statusNorm === "ok_fallback_local_rebuild"
          ? "CEPEA atualizado (rebuild local a partir dos arquivos em data/raw/cepea_spot)."
          : "Atualização CEPEA concluída com sucesso."
      );
      setCepeaStatus(data);

      await fetchCepeaStatus();

      if (selectedSymbol) {
        await loadDashboard(selectedSymbol);
      }
    } catch (error) {
      console.error(error);
      setCepeaActionMessage(
        formatNetworkFetchError(
          error,
          "Falha ao atualizar CEPEA."
        )
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
        fetchForwardCurve(symbol),
      ]);

      try {
        await fetchSoySpreadLatest();
        await fetchSoySpreadSeries();
      } catch (spreadError) {
        console.error(spreadError);
        setSoySpreadLatest({
          spread: "soy_porto_vs_interior",
          date: null,
          spot_port_brl: null,
          spot_interior_brl: null,
          spread_logistico_brl: null,
          spread_logistico_pct: null,
        });
        setSoySpreadSeries({
          spread: "soy_porto_vs_interior",
          location_port: "Paranaguá",
          location_interior: "Paraná",
          points_count: 0,
          items: [],
        });
      }

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
    const timerId = window.setInterval(() => {
      void fetchCepeaStatus();
    }, CEPEA_STATUS_REFRESH_MS);

    return () => {
      window.clearInterval(timerId);
    };
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

    console.log("Continuous data received:", { datesCount: dates.length, settlementsCount: settlements.length });

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

  const mercadoPriceSpec = useMemo(
    () => getAssetPriceSpec(selectedSymbol),
    [selectedSymbol]
  );

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
      forecastChartData.flatMap((item) => [
        item.history,
        item.forecast,
        item.ci20_low,
        item.ci20_high,
        item.ci30_low,
        item.ci30_high,
        ...(item.ic20 ?? []),
        ...(item.ic30 ?? []),
      ]),
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
    <div className="relative min-h-screen overflow-hidden bg-brand-bg font-brand text-brand-dark">
      {/* Grid Guide — Digital Architect */}
      <div className="grid-guide">
        <div className="hidden md:block md:col-span-3 grid-guide-col"></div>
        <div className="hidden md:block md:col-span-6 grid-guide-col"></div>
        <div className="hidden md:block md:col-span-3 h-full"></div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col border-x border-stone-300 bg-brand-bg">
        <header className="sticky top-0 z-50 border-b border-stone-300 bg-brand-bg">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="btn-timac btn-timac-outline !px-4 !py-2 !text-xs"
                >
                  ← Início
                </button>

                <button
                  type="button"
                  onClick={handleGoHome}
                  className="text-left transition hover:opacity-90"
                >
                  <span className="logo-timac-on-bege">
                    <img src="/logo-timac.png" alt="Timac AGRO" />
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-stone-300 bg-white px-3 py-1 font-mono text-xs uppercase text-stone-600">
                  v2.0.0
                </span>
                <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-widest text-stone-700">
                  Mercado • Macro • Clima • Produção • Custos
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl w-full px-4 py-6 md:px-6 lg:px-8 flex-1">
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("mercado")}
            className={`ds-tab ${activeTab === "mercado" ? "ds-tab-active" : "ds-tab-inactive"}`}
          >
            Mercado Futuro
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("macro")}
            className={`ds-tab ${activeTab === "macro" ? "ds-tab-active" : "ds-tab-inactive"}`}
          >
            Macro & Crédito Agro
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("mapa")}
            className={`ds-tab ${activeTab === "mapa" ? "ds-tab-active" : "ds-tab-inactive"}`}
          >
            Mapa Agroclimático
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("producao")}
            className={`ds-tab ${activeTab === "producao" ? "ds-tab-active" : "ds-tab-inactive"}`}
          >
            Produção Agrícola
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("custos")}
            className={`ds-tab ${activeTab === "custos" ? "ds-tab-active" : "ds-tab-inactive"}`}
          >
            Custos &amp; Performance
          </button>
        </div>

        {activeTab === "mercado" && (
          <div className="reveal active">
            {/* Section 1: Header & Selection */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 flex flex-col justify-between bg-stone-100/50">
                <div>
                  <span className="ds-kicker mb-4">01 / Mercado</span>
                  <h2 className="ds-display leading-tight text-stone-900">
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content">Mercado</span></span><br/>
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content text-brand-blue">Futuro</span></span>
                  </h2>
                  <p className="mt-8 text-sm leading-relaxed text-brand-stone-600 max-w-xs">
                    Análise quantitativa de derivativos, modelos de projeção e monitoramento de prêmios.
                  </p>
                </div>
                
                <div className="mt-12">
                  <label className="ds-field-label block mb-2">
                    Selecionar Ativo
                  </label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-blue shadow-sm"
                  >
                    {assets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} - {getAssetDisplayName(asset.symbol, asset.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-span-1 md:col-span-8 grid grid-cols-1 md:grid-cols-2">
                <div className="p-8 border-r border-stone-300 flex flex-col justify-center group hover:bg-white transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <span className="ds-field-label">Status B3</span>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getB3StatusBadge(b3StatusSummary.hasData)}`}>
                      {getB3StatusLabel(b3StatusSummary.hasData)}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-stone-300 pb-2">
                      <span className="text-xs text-brand-stone-600">Última Data</span>
                      <span className="text-xs font-bold">{formatDateOnly(b3StatusSummary.lastDate)}</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-300 pb-2">
                      <span className="text-xs text-brand-stone-600">Settlement</span>
                      <span className="text-xs font-bold text-right">
                        {formatNumber(b3StatusSummary.lastSettlement)}
                        {mercadoPriceSpec.axisShort ? (
                          <span className="block text-[10px] font-semibold text-brand-stone-500 normal-case">
                            {mercadoPriceSpec.axisShort}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-stone-300 pb-2">
                      <span className="text-xs text-brand-stone-600">Registros</span>
                      <span className="text-xs font-bold">{formatNumber(b3StatusSummary.rows, 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 flex flex-col justify-center group hover:bg-white transition-colors bg-stone-100/40">
                  <div className="flex items-center justify-between mb-6">
                    <span className="ds-field-label">Pipeline CEPEA</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cepeaStatus?.status === 'ok' || cepeaStatus?.status === 'ok_fallback_local_rebuild' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <span className="ds-field-label">Automático</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-stone-300 pb-2">
                      <span className="text-xs text-brand-stone-600">Status</span>
                      <span className="text-xs font-bold">{formatUpdateStatusLabel(cepeaStatus?.status)}</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-300 pb-2">
                      <span className="text-xs text-brand-stone-600">Último Basis</span>
                      <span className="text-xs font-bold">
                        {getCepeaLastBasisLabel(cepeaStatus, soySpreadLatest?.date)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-stone-300 pb-2">
                      <span className="text-xs text-brand-stone-600">Sincronização</span>
                      <span className="text-xs font-bold">
                        {getCepeaSyncLabel(cepeaStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUpdateCepea}
                      disabled={updatingCepea}
                      className="btn-timac !px-3 !py-1.5 !text-[10px] disabled:opacity-60"
                    >
                      {updatingCepea ? "Executando..." : "Executar agora"}
                    </button>
                  </div>
                  {cepeaActionMessage ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-brand-stone-600">
                      {cepeaActionMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Características de cotação & contrato (B3) */}
            <div className="border-b border-stone-300 bg-gradient-to-b from-white to-stone-100/50">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                  <div>
                    <span className="ds-field-label block mb-1">
                      Características do preço
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-brand-dark">
                      {selectedSymbol} · {getAssetDisplayName(selectedSymbol, assets.find((a) => a.symbol === selectedSymbol)?.name)}
                    </h3>
                    <p className="mt-1 text-xs text-brand-stone-600 max-w-2xl">
                      Referência de negociação na {mercadoPriceSpec.exchange}: moeda de cotação, unidade do ajuste e tamanho típico do contrato.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <span className="ds-field-label block mb-1">Moeda</span>
                    <span className="text-sm font-bold text-brand-dark">{mercadoPriceSpec.currencyLabel}</span>
                    <span className="text-[10px] text-brand-stone-500 block mt-0.5">{mercadoPriceSpec.currencyCode}</span>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-2">
                    <span className="ds-field-label block mb-1">Unidade de cotação</span>
                    <span className="text-sm font-bold text-brand-dark">{mercadoPriceSpec.quoteKind}</span>
                    <span className="text-[10px] text-brand-stone-600 block mt-1 leading-snug">{mercadoPriceSpec.quoteDetail}</span>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <span className="ds-field-label block mb-1">Contrato (lote)</span>
                    <span className="text-sm font-bold text-brand-dark">{mercadoPriceSpec.contractLot}</span>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <span className="ds-field-label block mb-1">Série exibida</span>
                    <span className="text-sm font-bold text-brand-dark">Ajuste / contínua</span>
                    <span className="text-[10px] text-brand-stone-500 block mt-0.5">{mercadoPriceSpec.axisShort || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Chart & Insights */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-12 p-8 border-b border-stone-300 bg-stone-100/40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-7 xl:col-span-8">
                    <span className="ds-field-label mb-2 block">Retrato Horizontal</span>
                    <h3 className="text-xl font-bold text-brand-dark mb-4">Sinais de mercado — {selectedSymbol}</h3>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl border border-stone-300 bg-white">
                        <span className="ds-field-label block mb-1">Estratégia</span>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${getSignalBadge(strategy?.signal)}`}>
                          {formatSignalName(strategy?.signal)}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl border border-stone-300 bg-white">
                        <span className="ds-field-label block mb-1">Sentimento</span>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${getSentimentBadge(sentiment?.sentiment_label)}`}>
                          {sentiment?.sentiment_label || "Neutro"}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl border border-stone-300 bg-white">
                        <span className="ds-field-label block mb-1">Volatilidade</span>
                        <span className="text-sm font-bold text-brand-dark">Moderada</span>
                      </div>
                      <div className="p-4 rounded-xl border border-stone-300 bg-white">
                        <span className="ds-field-label block mb-1">Tendência</span>
                        <span className="text-sm font-bold text-brand-dark">Lateral</span>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5 xl:col-span-4 p-5 rounded-2xl border border-brand-blue/20 bg-white shadow-sm flex flex-col justify-center min-h-[140px]">
                    <span className="ds-field-label mb-2 block text-brand-blue">Resumo quantitativo</span>
                    <p className="text-xs leading-relaxed text-brand-stone-600 italic">
                      {strategy?.insight || "Análise quantitativa processando sinais de B3 e CEPEA..."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-9 border-r border-stone-300 p-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <span className="ds-field-label mb-2 block">Visualização temporal</span>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tighter text-brand-dark">Série contínua</h3>
                    {mercadoPriceSpec.axisShort ? (
                      <p className="mt-1 text-xs text-brand-stone-600">
                        Eixo: <span className="font-semibold text-brand-dark">{mercadoPriceSpec.axisShort}</span>
                        {" · "}
                        {mercadoPriceSpec.currencyLabel}
                      </p>
                    ) : null}
                  </div>
                  {continuousSummary && (
                    <div className="flex gap-4">
                      <div className="text-right">
                        <span className="ds-field-label block">Variação</span>
                        <span className="text-lg font-bold text-brand-blue">{formatNumber(continuousSummary.pct, 2)}%</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-[400px] w-full">
                  {seriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={seriesData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0071B9" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#0071B9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: "#78716c" }}
                          axisLine={{ stroke: '#d6d3d1' }}
                          tickLine={false}
                          minTickGap={30}
                          tickFormatter={formatShortDate}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: "#78716c" }}
                          axisLine={false}
                          tickLine={false}
                          domain={continuousYDomain}
                          tickFormatter={(v) => formatNumber(v, 2)}
                          label={
                            mercadoPriceSpec.axisShort
                              ? {
                                  value: mercadoPriceSpec.axisShort,
                                  angle: -90,
                                  position: "insideLeft",
                                  offset: 4,
                                  style: { fill: "#78716c", fontSize: 10, fontWeight: 600 },
                                }
                              : undefined
                          }
                        />
                        <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                        <Area
                          type="monotone"
                          dataKey="settlement"
                          stroke="#0071B9"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-brand-stone-400">
                      Sem dados de série contínua para exibir.
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 md:col-span-3 flex flex-col">
                <div className="p-8 border-b border-stone-300 flex-1 group hover:bg-white transition-colors">
                  <span className="ds-field-label mb-4 block">Estratégia Sugerida</span>
                  {strategy ? (
                    <div>
                      <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3 ${getSignalBadge(strategy.signal)}`}>
                        {formatSignalName(strategy.signal)}
                      </span>
                      <p className="text-xs leading-relaxed text-brand-stone-600">
                        {strategy.insight}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-brand-stone-400">Aguardando dados...</p>
                  )}
                </div>
                <div className="p-8 border-b border-stone-300 flex-1 group hover:bg-white transition-colors">
                  <span className="ds-field-label mb-4 block">Sentimento de Mercado</span>
                  {sentiment ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl font-bold tracking-tighter">{formatNumber(sentiment.sentiment_score, 1)}</span>
                        <span className={`text-[10px] font-bold uppercase ${getSentimentBadge(sentiment.sentiment_label)}`}>
                          {sentiment.sentiment_label}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-brand-stone-600">
                        {sentiment.editorial_summary}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-brand-stone-400">Aguardando dados...</p>
                  )}
                </div>
                <div className="p-8 flex-1 group hover:bg-white transition-colors bg-stone-50/90">
                  <span className="ds-field-label mb-4 block">Manchetes Monitoradas</span>
                  <div className="space-y-3">
                    {sentiment?.latest_headlines?.map((h: any, i: number) => {
                      const title = typeof h === 'string' ? h : h?.title;
                      if (!title) return null;
                      return (
                        <div key={i} className="p-3 rounded-lg border border-stone-200 bg-white/50 text-[10px] text-brand-stone-600 leading-snug">
                          {title}
                        </div>
                      );
                    })}
                    {(!sentiment?.latest_headlines || sentiment.latest_headlines.length === 0) && (
                      <p className="text-[10px] text-brand-stone-400 italic">Nenhuma manchete recente para este ativo.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Forecast & Basis */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 bg-stone-100/60">
                <span className="ds-field-label mb-4 block">Projeção Inteligente</span>
                <h3 className="text-3xl font-bold tracking-tighter text-brand-dark mb-2">Forecast Engine</h3>
                {mercadoPriceSpec.axisShort ? (
                  <p className="mb-6 text-xs text-brand-stone-600">
                    Projeção na mesma unidade da série: <span className="font-semibold text-brand-dark">{mercadoPriceSpec.axisShort}</span>
                  </p>
                ) : (
                  <div className="mb-6" />
                )}
                {forecast && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl border border-brand-blue/20 bg-brand-blue/5 shadow-sm">
                      <span className="ds-field-label mb-1 block text-brand-blue">Modelo Ativo</span>
                      <span className="text-sm font-bold text-brand-dark">{forecast.model?.toUpperCase() || "Ensemble Quant"}</span>
                    </div>
                    <div className="group p-4 rounded-xl border border-stone-300 bg-white shadow-sm hover:shadow-md transition-all">
                      <span className="ds-field-label block mb-1">Média prevista</span>
                      <span className="text-2xl font-bold text-brand-dark">{formatNumber(forecast.metrics.forecast_mean)}</span>
                      {mercadoPriceSpec.axisShort ? (
                        <span className="mt-1 block text-[10px] text-brand-stone-500">{mercadoPriceSpec.axisShort}</span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border border-stone-300 bg-white/50">
                        <span className="text-[8px] font-bold uppercase text-brand-stone-600 block">Mínimo</span>
                        <span className="text-sm font-bold">{formatNumber(forecast.metrics.forecast_min)}</span>
                      </div>
                      <div className="p-3 rounded-lg border border-stone-300 bg-white/50">
                        <span className="text-[8px] font-bold uppercase text-brand-stone-600 block">Máximo</span>
                        <span className="text-sm font-bold">{formatNumber(forecast.metrics.forecast_max)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-1 md:col-span-8 p-8">
                <div className="mb-4">
                  <span className="ds-field-label block">Horizonte de projeção</span>
                  {mercadoPriceSpec.axisShort ? (
                    <p className="text-xs text-brand-stone-600 mt-1">Eixo do gráfico: {mercadoPriceSpec.axisShort}</p>
                  ) : null}
                </div>
                <div className="h-[350px] w-full">
                  {forecastChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecastChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 10, fill: "#78716c" }} 
                          axisLine={{ stroke: '#d6d3d1' }} 
                          tickLine={false} 
                          minTickGap={30}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#78716c" }}
                          axisLine={false}
                          tickLine={false}
                          domain={forecastYDomain}
                          tickFormatter={(v) => formatNumber(v, 2)}
                          label={
                            mercadoPriceSpec.axisShort
                              ? {
                                  value: mercadoPriceSpec.axisShort,
                                  angle: -90,
                                  position: "insideLeft",
                                  offset: 4,
                                  style: { fill: "#78716c", fontSize: 10, fontWeight: 600 },
                                }
                              : undefined
                          }
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle().contentStyle}
                          formatter={(v: unknown, name?: string) => {
                            const n = name ?? "";
                            if (n.includes("Limite")) {
                              return [null, null];
                            }
                            if (Array.isArray(v) && v.length >= 2) {
                              return [
                                `${formatNumber(Number(v[0]), 2)} – ${formatNumber(Number(v[1]), 2)}`,
                                n,
                              ];
                            }
                            return [formatNumber(Number(v), 2), n];
                          }}
                          labelFormatter={(label) => `Período: ${label}`}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                          formatter={(value) => (
                            <span className="text-brand-stone-700">{value}</span>
                          )}
                        />
                        {/* Intervalos: tupla [inf, sup] — faixa real entre curvas, sem baseline em 0 */}
                        <Area
                          type="monotone"
                          dataKey="ic30"
                          stroke="none"
                          fill="#0071B9"
                          fillOpacity={0.22}
                          connectNulls={false}
                          isAnimationActive={false}
                          name="IC ~30%"
                        />
                        <Area
                          type="monotone"
                          dataKey="ic20"
                          stroke="none"
                          fill="#38BDF8"
                          fillOpacity={0.35}
                          connectNulls={false}
                          isAnimationActive={false}
                          name="IC ~20%"
                        />
                        <Line
                          type="monotone"
                          dataKey="ci30_low"
                          stroke="#0071B9"
                          strokeWidth={1.25}
                          strokeOpacity={0.55}
                          strokeDasharray="5 4"
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                          name="Limite 30% inf."
                        />
                        <Line
                          type="monotone"
                          dataKey="ci30_high"
                          stroke="#0071B9"
                          strokeWidth={1.25}
                          strokeOpacity={0.55}
                          strokeDasharray="5 4"
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                          name="Limite 30% sup."
                        />
                        <Line
                          type="monotone"
                          dataKey="ci20_low"
                          stroke="#0ea5e9"
                          strokeWidth={1}
                          strokeOpacity={0.75}
                          strokeDasharray="3 3"
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                          name="Limite 20% inf."
                        />
                        <Line
                          type="monotone"
                          dataKey="ci20_high"
                          stroke="#0ea5e9"
                          strokeWidth={1}
                          strokeOpacity={0.75}
                          strokeDasharray="3 3"
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                          name="Limite 20% sup."
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          stroke="#0071B9"
                          strokeWidth={3}
                          dot={false}
                          connectNulls
                          isAnimationActive={false}
                          name="Projeção"
                        />
                        <Line
                          type="monotone"
                          dataKey="history"
                          stroke="#78716c"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          isAnimationActive={false}
                          name="Histórico"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-brand-stone-400">
                      Sem dados de projeção para exibir.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Forward Curve */}
            <div className="border-b border-stone-300">
              <div className="p-8 bg-stone-100/40">
                <span className="ds-field-label mb-4 block">Estrutura a Termo</span>
                <h3 className="text-3xl font-bold tracking-tighter text-brand-dark mb-8">Forward Curve</h3>
                <div className="rounded-2xl border border-stone-300 overflow-hidden bg-transparent">
                  <ForwardCurvesPanel
                    data={forwardCurve}
                    loading={loadingMain}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Backtest & Ranking */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 bg-stone-100/60">
                <span className="ds-field-label mb-4 block">Validação Histórica</span>
                <h3 className="text-3xl font-bold tracking-tighter text-brand-dark mb-6">Backtest Ranking</h3>
                <p className="text-xs leading-relaxed text-brand-stone-600 mb-8">
                  Performance comparativa de modelos estatísticos em janelas deslizantes de {backtestHorizon} dias.
                </p>
                {backtest && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-stone-300 bg-white shadow-sm">
                      <span className="ds-field-label block mb-1">Melhor RMSE</span>
                      <span className="text-sm font-bold text-brand-dark">{formatModelName(backtest.best_model_rmse)}</span>
                    </div>
                    <div className="p-4 rounded-xl border border-stone-300 bg-white shadow-sm">
                      <span className="ds-field-label block mb-1">Melhor Direcional</span>
                      <span className="text-sm font-bold text-brand-dark">{formatModelName(backtest.best_model_directional)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-1 md:col-span-8 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <span className="ds-field-label mb-4 block">Ranking RMSE (Menor é melhor)</span>
                  <div className="h-[250px] w-full">
                    {backtestRmseChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={backtestRmseChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="model" type="category" tick={{ fontSize: 10, fill: "#78716c" }} width={100} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                          <Bar dataKey="rmse" fill="#0071B9" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-brand-stone-400">
                        {loadingBacktest ? "Calculando backtest..." : "Sem dados de ranking."}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="ds-field-label mb-4 block">Acurácia Direcional (%)</span>
                  <div className="h-[250px] w-full">
                    {backtestDirectionalChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={backtestDirectionalChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="model" type="category" tick={{ fontSize: 10, fill: "#78716c" }} width={100} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                          <Bar dataKey="directional_accuracy" fill="#22C55E" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-brand-stone-400">
                        {loadingBacktest ? "Calculando backtest..." : "Sem dados de acurácia."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Basis (Soy specific) */}
            {selectedSymbol === "SJC" && soySpreadSeries && (
              <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
                <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 bg-stone-100/50">
                  <span className="ds-field-label mb-4 block">Radar de Arbitragem</span>
                  <h3 className="text-2xl font-bold tracking-tighter text-brand-dark mb-8">Basis Porto vs Interior</h3>
                  
                  {soySpreadLatest && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border border-stone-300 bg-white shadow-sm">
                          <span className="ds-field-label block mb-1">Basis Atual</span>
                          <span className="text-lg font-bold text-brand-dark">{formatNumber(soySpreadLatest.spread_logistico_brl, 2)} R$/saca</span>
                        </div>
                        <div className="p-4 rounded-xl border border-stone-300 bg-white shadow-sm">
                          <span className="ds-field-label block mb-1">MA30</span>
                          <span className="text-lg font-bold text-brand-dark">{formatNumber(soySpreadChartTail[soySpreadChartTail.length-1]?.ma30_brl, 2)} R$/saca</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-300 bg-white shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="ds-field-label">Desvio vs MA30</span>
                          <span className={`text-sm font-bold ${Number(soySpreadLatest.spread_logistico_pct) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatNumber(Number(soySpreadLatest.spread_logistico_pct) * 100, 2)}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-lg border border-stone-200 bg-stone-100/60 text-center">
                          <span className="text-[8px] font-bold uppercase text-brand-stone-500 block">Mín Hist.</span>
                          <span className="text-xs font-bold text-brand-dark">{formatNumber(Math.min(...soySpreadChartTail.map(i => i.spread_logistico_brl || 0)), 2)}</span>
                        </div>
                        <div className="p-3 rounded-lg border border-stone-200 bg-stone-100/60 text-center">
                          <span className="text-[8px] font-bold uppercase text-brand-stone-500 block">Média Hist.</span>
                          <span className="text-xs font-bold text-brand-dark">{formatNumber(soySpreadChartTail.reduce((a, b) => a + (b.spread_logistico_brl || 0), 0) / soySpreadChartTail.length, 2)}</span>
                        </div>
                        <div className="p-3 rounded-lg border border-stone-200 bg-stone-100/60 text-center">
                          <span className="text-[8px] font-bold uppercase text-brand-stone-500 block">Máx Hist.</span>
                          <span className="text-xs font-bold text-brand-dark">{formatNumber(Math.max(...soySpreadChartTail.map(i => i.spread_logistico_brl || 0)), 2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-span-1 md:col-span-8 p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="ds-field-label">Série Temporal do Basis (BRL/sc)</span>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-blue"></div>
                        <span className="ds-field-label">Spread</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="ds-field-label">MA30</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    {soySpreadChartTail.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={soySpreadChartTail}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} tickFormatter={formatShortDate} />
                          <YAxis domain={soySpreadYDomain} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v, 2)} />
                          <Tooltip 
                            contentStyle={chartTooltipStyle().contentStyle} 
                            formatter={(v: any) => [formatNumber(v, 2), ""]}
                          />
                          <Line type="monotone" dataKey="spread_logistico_brl" stroke="#0071B9" strokeWidth={2} dot={false} name="Spread" connectNulls />
                          <Line type="monotone" dataKey="ma30_brl" stroke="#F59E0B" strokeWidth={2} dot={false} name="MA30" connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-brand-stone-400">
                        Sem dados de basis para exibir.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "macro" && (
          <div className="reveal active">
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 flex flex-col justify-between bg-stone-100/50">
                <div>
                  <span className="ds-kicker mb-4">02 / Macro &amp; Crédito Agro</span>
                  <h2 className="ds-display leading-tight text-stone-900">
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content">Macro &amp;</span></span><br/>
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content text-brand-blue">Crédito Agro</span></span>
                  </h2>
                  <p className="mt-8 text-sm leading-relaxed text-brand-stone-600 max-w-xs">
                    Monitoramento de indicadores macroeconômicos e fluxo de crédito para o agronegócio.
                  </p>
                </div>
              </div>
              <div className="col-span-1 md:col-span-8">
                {macroRegime?.regime && (
                  <div className="p-8 flex flex-col justify-center h-full group hover:bg-white transition-colors">
                    <div className="mb-6 w-fit max-w-full">
                      <span className="ds-field-label mb-1 block">Regime Atual</span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${getMacroRegimeBadgeClass(
                          macroRegime.regime.badge
                        )}`}
                      >
                        {macroRegime.regime.label}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-brand-dark leading-relaxed">
                      {macroRegime.regime.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="border-b border-stone-300">
              <MacroCreditoAgroPanel />
            </div>
          </div>
        )}

        {activeTab === "mapa" && (
          <div className="reveal active">
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 flex flex-col justify-between bg-stone-100/50">
                <div>
                  <span className="ds-kicker mb-4">03 / Clima</span>
                  <h2 className="ds-display leading-tight text-stone-900">
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content">Mapa</span></span><br/>
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content text-brand-blue">Agroclimático</span></span>
                  </h2>
                  <p className="mt-8 text-sm leading-relaxed text-brand-stone-600 max-w-xs">
                    Risco de seca municipal e monitoramento de índices agroclimáticos em tempo real.
                  </p>
                </div>
              </div>
              <div className="col-span-1 md:col-span-8 p-8 flex items-center justify-center bg-stone-100/40">
                <div className="grid grid-cols-3 gap-8 w-full max-w-lg">
                  <div className="text-center">
                    <span className="ds-field-label block mb-1">Municípios</span>
                    <span className="text-3xl font-bold tracking-tighter text-brand-dark">5.570</span>
                  </div>
                  <div className="text-center">
                    <span className="ds-field-label block mb-1">Índice IIS</span>
                    <span className="text-3xl font-bold tracking-tighter text-brand-blue">CEMADEN</span>
                  </div>
                  <div className="text-center">
                    <span className="ds-field-label block mb-1">Atualização</span>
                    <span className="text-3xl font-bold tracking-tighter text-brand-dark">Mensal</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-0">
              <div className="border-b border-stone-300">
                <MunicipalRiskMap
                  selectedUf={mapSelectedUf}
                  onSelectedUfChange={setMapSelectedUf}
                  selectedMunicipio={mapSelectedMunicipio}
                  onSelectedMunicipioChange={setMapSelectedMunicipio}
                  selectedWindow={mapSelectedWindow}
                  onSelectedWindowChange={setMapSelectedWindow}
                  onMunicipioSnapshotChange={setMapMunicipioSnapshot}
                  showSelectors={true}
                />
              </div>
              <div className="border-b border-stone-300">
                <AgroClimaPanel
                  selectedCodeMuni={mapSelectedMunicipio || null}
                  selectedUf={mapSelectedUf}
                  selectedWindow={mapSelectedWindow}
                  initialUf={mapSelectedUf || "RS"}
                  showSelector={false}
                  iisSnapshot={mapMunicipioSnapshot}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "producao" && (
          <div className="reveal active">
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 flex flex-col justify-between bg-stone-100/50">
                <div>
                  <span className="ds-kicker mb-4">04 / Produção</span>
                  <h2 className="ds-display leading-tight text-stone-900">
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content">Produção</span></span><br/>
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content text-brand-blue">Agrícola</span></span>
                  </h2>
                  <p className="mt-8 text-sm leading-relaxed text-brand-stone-600 max-w-xs">
                    Dados de safra, área plantada e produtividade por cultura e região.
                  </p>
                </div>
              </div>
              <div className="col-span-1 md:col-span-8 p-8 flex items-center bg-stone-100/40">
                <div className="flex gap-12">
                  <div className="flex flex-col gap-1">
                    <span className="ds-field-label">Fonte Primária</span>
                    <span className="text-lg font-bold text-brand-dark">CONAB / IBGE</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="ds-field-label">Culturas</span>
                    <span className="text-lg font-bold text-brand-dark">Soja, Milho, Trigo</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-b border-stone-300">
              <AgroProductionPanel />
            </div>
          </div>
        )}

        {activeTab === "custos" && (
          <div className="reveal active">
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
              <div className="col-span-1 md:col-span-4 p-8 border-r border-stone-300 flex flex-col justify-between bg-stone-100/50">
                <div>
                  <span className="ds-kicker mb-4">05 / Custos</span>
                  <h2 className="ds-display leading-tight text-stone-900">
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content">Custos &amp;</span></span><br/>
                    <span className="text-reveal-wrapper reveal-active"><span className="text-reveal-content text-brand-blue">Performance</span></span>
                  </h2>
                  <p className="mt-8 text-sm leading-relaxed text-brand-stone-600 max-w-xs">
                    Custo de produção CONAB (soja, agricultura empresarial) agregado por macrorregião,
                    com leitura estratégica e referência visual para composição da saca.
                  </p>
                </div>
              </div>
              <div className="col-span-1 md:col-span-8 p-8 flex items-center bg-stone-100/40">
                <div className="flex flex-wrap gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="ds-field-label">Fonte</span>
                    <span className="text-lg font-bold text-brand-dark">CONAB — CustoProducao.txt</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="ds-field-label">Cultura</span>
                    <span className="text-lg font-bold text-brand-dark">Soja (60 kg)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-b border-stone-300 p-4 md:p-6">
              <CustosPerformancePanel />
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
