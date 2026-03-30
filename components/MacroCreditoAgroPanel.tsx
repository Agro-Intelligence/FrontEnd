"use client";

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
} from "recharts";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const SKY = "#38BDF8";
const EMERALD = "#22C55E";
const AMBER = "#F59E0B";
const SILVER = "#C9CED6";
const ROSE = "#FB7185";
const CYAN = "#06B6D4";

type OverviewCard = {
  label: string;
  unit: string;
  last_date: string | null;
  last_value: number | null;
  metric?: string | null;
};

type RegimeContribution = {
  factor: string;
  signal: string;
  impact: number;
};

type RegimeLatestItem = {
  value: number | null;
  date: string | null;
  delta_abs?: number | null;
  delta_pct?: number | null;
};

type RegimeResponse = {
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
    contributions: RegimeContribution[];
    latest: {
      selic: RegimeLatestItem;
      usd: RegimeLatestItem;
      ipca_expectation: RegimeLatestItem;
      inadimplencia_rural_media: RegimeLatestItem;
    };
  };
};

type OverviewResponse = {
  start: string;
  end: string;
  ipca_reference_year: string;
  cards: {
    selic: OverviewCard;
    usd: OverviewCard;
    ipca_expectation: OverviewCard;
    pf_credito_rural_total: OverviewCard;
    pj_credito_rural_total: OverviewCard;
  };
  regime?: RegimeResponse["regime"];
};

type SeriesItem = {
  date: string;
  value: number | null;
};

type SeriesEntry = {
  key: string;
  label: string;
  unit: string;
  last_date: string | null;
  last_value: number | null;
  metric?: string;
  items: SeriesItem[];
};

type RuralCreditSeriesMap = Record<string, SeriesEntry>;

type SeriesResponse = {
  start: string;
  end: string;
  ipca_reference_year: string;
  series: {
    selic: SeriesEntry;
    usd: SeriesEntry;
    ipca_expectation: SeriesEntry;
    rural_credit: RuralCreditSeriesMap;
  };
};

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

function formatDateOnly(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
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

function makeChartData(entry?: SeriesEntry | null) {
  if (!entry?.items?.length) return [];
  return entry.items.map((item) => ({
    date: item.date,
    value: item.value,
  }));
}

function buildMultiLineData(seriesList: Array<SeriesEntry | undefined>) {
  const dateMap = new Map<string, Record<string, string | number | null>>();

  seriesList.forEach((entry) => {
    if (!entry?.items?.length) return;

    entry.items.forEach((item) => {
      const base = dateMap.get(item.date) || { date: item.date };
      base[entry.key] = item.value;
      dateMap.set(item.date, base);
    });
  });

  return Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
}

function getRegimeBadgeClass(badge?: string) {
  switch (badge) {
    case "restrictive":
      return "bg-red-950/70 text-red-300 border-red-800";
    case "pro_export":
      return "bg-emerald-950/70 text-emerald-300 border-emerald-800";
    default:
      return "bg-amber-950/70 text-amber-300 border-amber-800";
  }
}

export default function MacroCreditoAgroPanel() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [regime, setRegime] = useState<RegimeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  async function loadPanel() {
    try {
      setLoading(true);
      setPanelError(null);

      const [overviewRes, seriesRes, regimeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/macro-credito-agro/overview`),
        fetch(`${API_BASE_URL}/macro-credito-agro/series`),
        fetch(`${API_BASE_URL}/macro-credito-agro/regime`),
      ]);

      if (!overviewRes.ok) {
        throw new Error("Erro ao carregar overview do Macro & Crédito Agro.");
      }
      if (!seriesRes.ok) {
        throw new Error("Erro ao carregar séries do Macro & Crédito Agro.");
      }
      if (!regimeRes.ok) {
        throw new Error("Erro ao carregar indicador de regime macro.");
      }

      const overviewData: OverviewResponse = await overviewRes.json();
      const seriesData: SeriesResponse = await seriesRes.json();
      const regimeData: RegimeResponse = await regimeRes.json();

      setOverview(overviewData);
      setSeries(seriesData);
      setRegime(regimeData);
    } catch (error) {
      console.error(error);
      setPanelError(
        error instanceof Error
          ? error.message
          : "Falha ao carregar o painel Macro & Crédito Agro."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPanel();
  }, []);

  const selicChartData = useMemo(
    () => makeChartData(series?.series?.selic),
    [series]
  );
  const usdChartData = useMemo(
    () => makeChartData(series?.series?.usd),
    [series]
  );
  const ipcaChartData = useMemo(
    () => makeChartData(series?.series?.ipca_expectation),
    [series]
  );

  const pfMercado = series?.series?.rural_credit?.pf_credito_rural_mercado;
  const pfRegulado = series?.series?.rural_credit?.pf_credito_rural_regulado;
  const pfTotal = series?.series?.rural_credit?.pf_credito_rural_total;

  const pjMercado = series?.series?.rural_credit?.pj_credito_rural_mercado;
  const pjRegulado = series?.series?.rural_credit?.pj_credito_rural_regulado;
  const pjTotal = series?.series?.rural_credit?.pj_credito_rural_total;

  const pfChartData = useMemo(
    () => buildMultiLineData([pfMercado, pfRegulado, pfTotal]),
    [pfMercado, pfRegulado, pfTotal]
  );

  const pjChartData = useMemo(
    () => buildMultiLineData([pjMercado, pjRegulado, pjTotal]),
    [pjMercado, pjRegulado, pjTotal]
  );

  const selicYDomain = useMemo(
    () => getSafeYDomain(selicChartData.map((d) => Number(d.value)), 0.12),
    [selicChartData]
  );

  const usdYDomain = useMemo(
    () => getSafeYDomain(usdChartData.map((d) => Number(d.value)), 0.1),
    [usdChartData]
  );

  const ipcaYDomain = useMemo(
    () => getSafeYDomain(ipcaChartData.map((d) => Number(d.value)), 0.12),
    [ipcaChartData]
  );

  const pfYDomain = useMemo(
    () =>
      getSafeYDomain(
        pfChartData.flatMap((d) => [
          Number(d.pf_credito_rural_mercado),
          Number(d.pf_credito_rural_regulado),
          Number(d.pf_credito_rural_total),
        ]),
        0.12
      ),
    [pfChartData]
  );

  const pjYDomain = useMemo(
    () =>
      getSafeYDomain(
        pjChartData.flatMap((d) => [
          Number(d.pj_credito_rural_mercado),
          Number(d.pj_credito_rural_regulado),
          Number(d.pj_credito_rural_total),
        ]),
        0.12
      ),
    [pjChartData]
  );

  const cards = overview?.cards;

  const ruralSummaryRows = useMemo(
    () =>
      [
        pjMercado,
        pjRegulado,
        pjTotal,
        pfMercado,
        pfRegulado,
        pfTotal,
      ].filter(Boolean) as SeriesEntry[],
    [pjMercado, pjRegulado, pjTotal, pfMercado, pfRegulado, pfTotal]
  );

  const activeRegime = regime?.regime ?? overview?.regime;

  return (
    <div className="space-y-6">
      {panelError && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {panelError}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300 shadow-sm backdrop-blur">
          Carregando Macro & Crédito Agro...
        </div>
      )}

      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Banco Central do Brasil
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">
              Macro & Crédito Agro
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Painel macroeconômico com SELIC, câmbio USD/BRL, expectativas Focus
              de IPCA, inadimplência do crédito rural e um indicador executivo de regime.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Faixa: {overview?.start ?? "2020-01-01"} até {overview?.end ?? "-"}
          </div>
        </div>
      </div>

      {activeRegime && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                Indicador Inteligente
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-100">
                Regime Macro Agro
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                {activeRegime.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRegimeBadgeClass(
                  activeRegime.badge
                )}`}
              >
                {activeRegime.label}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200">
                Score: {activeRegime.score}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                SELIC
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {activeRegime.signals.selic_level}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatNumber(activeRegime.latest.selic.value)}% •{" "}
                {formatDateOnly(activeRegime.latest.selic.date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                IPCA Focus
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {activeRegime.signals.ipca_signal}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatNumber(activeRegime.latest.ipca_expectation.value)}% •{" "}
                {formatDateOnly(activeRegime.latest.ipca_expectation.date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                USD/BRL
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {activeRegime.signals.usd_direction}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Δ recente: {formatPercent(activeRegime.latest.usd.delta_pct)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Inadimplência Rural
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {activeRegime.signals.inadimplencia_direction}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Δ abs.: {formatNumber(activeRegime.latest.inadimplencia_rural_media.delta_abs)} p.p.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">
              Vetores do score
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {activeRegime.contributions.map((item, idx) => (
                <div
                  key={`${item.factor}-${idx}`}
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-400">
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
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {cards?.selic.label ?? "SELIC"}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatNumber(cards?.selic.last_value)}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ref.: {formatDateOnly(cards?.selic.last_date)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {cards?.usd.label ?? "USD/BRL"}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatNumber(cards?.usd.last_value)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ref.: {formatDateOnly(cards?.usd.last_date)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {cards?.ipca_expectation.label ?? "IPCA Focus 2026"}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatNumber(cards?.ipca_expectation.last_value)}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Métrica: {cards?.ipca_expectation.metric ?? "Media"} • Ref.:{" "}
            {formatDateOnly(cards?.ipca_expectation.last_date)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {cards?.pf_credito_rural_total.label ?? "PF Crédito Rural - Total"}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatNumber(cards?.pf_credito_rural_total.last_value)}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ref.: {formatDateOnly(cards?.pf_credito_rural_total.last_date)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {cards?.pj_credito_rural_total.label ?? "PJ Crédito Rural - Total"}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatNumber(cards?.pj_credito_rural_total.last_value)}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ref.: {formatDateOnly(cards?.pj_credito_rural_total.last_date)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl xl:col-span-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-100">SELIC</h3>
            <p className="text-sm text-slate-400">
              Série histórica da taxa SELIC via SGS.
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selicChartData}>
                <defs>
                  <linearGradient id="selicFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => formatShortDate(String(value))}
                  minTickGap={24}
                />
                <YAxis
                  domain={selicYDomain}
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => `${formatNumber(Number(value), 2)}%`}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  labelFormatter={(label) => formatDateOnly(String(label))}
                  formatter={(value: number | string | undefined) => [
                    value == null ? "-" : `${formatNumber(Number(value), 2)}%`,
                    "SELIC",
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="SELIC"
                  stroke={EMERALD}
                  fill="url(#selicFill)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl xl:col-span-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-100">USD/BRL</h3>
            <p className="text-sm text-slate-400">
              Série histórica do dólar capturada via módulo de moedas do python-bcb.
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usdChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => formatShortDate(String(value))}
                  minTickGap={24}
                />
                <YAxis
                  domain={usdYDomain}
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => formatNumber(Number(value), 2)}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  labelFormatter={(label) => formatDateOnly(String(label))}
                  formatter={(value: number | string | undefined) => [
                    value == null ? "-" : formatNumber(Number(value), 4),
                    "USD/BRL",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="USD/BRL"
                  stroke={SKY}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl xl:col-span-12">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-100">
              Focus — IPCA {overview?.ipca_reference_year ?? "2026"}
            </h3>
            <p className="text-sm text-slate-400">
              Evolução da expectativa anual de mercado para o IPCA.
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ipcaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => formatShortDate(String(value))}
                  minTickGap={24}
                />
                <YAxis
                  domain={ipcaYDomain}
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => `${formatNumber(Number(value), 2)}%`}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  labelFormatter={(label) => formatDateOnly(String(label))}
                  formatter={(value: number | string | undefined) => [
                    value == null ? "-" : `${formatNumber(Number(value), 2)}%`,
                    `IPCA ${overview?.ipca_reference_year ?? "2026"}`,
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={`IPCA ${overview?.ipca_reference_year ?? "2026"}`}
                  stroke={AMBER}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl xl:col-span-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-100">
              Inadimplência Crédito Rural — PF
            </h3>
            <p className="text-sm text-slate-400">
              Pessoas físicas: taxas de mercado, reguladas e total.
            </p>
          </div>

          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pfChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => formatShortDate(String(value))}
                  minTickGap={24}
                />
                <YAxis
                  domain={pfYDomain}
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => `${formatNumber(Number(value), 2)}%`}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  labelFormatter={(label) => formatDateOnly(String(label))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pf_credito_rural_mercado"
                  name="PF Mercado"
                  stroke={EMERALD}
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pf_credito_rural_regulado"
                  name="PF Reguladas"
                  stroke={SKY}
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pf_credito_rural_total"
                  name="PF Total"
                  stroke={SILVER}
                  strokeWidth={2.4}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl xl:col-span-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-100">
              Inadimplência Crédito Rural — PJ
            </h3>
            <p className="text-sm text-slate-400">
              Pessoas jurídicas: taxas de mercado, reguladas e total.
            </p>
          </div>

          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pjChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => formatShortDate(String(value))}
                  minTickGap={24}
                />
                <YAxis
                  domain={pjYDomain}
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => `${formatNumber(Number(value), 2)}%`}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  labelFormatter={(label) => formatDateOnly(String(label))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pj_credito_rural_mercado"
                  name="PJ Mercado"
                  stroke={ROSE}
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pj_credito_rural_regulado"
                  name="PJ Reguladas"
                  stroke={CYAN}
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pj_credito_rural_total"
                  name="PJ Total"
                  stroke={SILVER}
                  strokeWidth={2.4}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-slate-100">
            Resumo de Crédito Rural
          </h3>
          <p className="text-sm text-slate-400">
            Últimas leituras das séries de inadimplência monitoradas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="py-2 pr-3">Série</th>
                <th className="py-2 pr-3">Última data</th>
                <th className="py-2 pr-3">Último valor</th>
              </tr>
            </thead>
            <tbody>
              {ruralSummaryRows.map((entry, index) => (
                <tr
                  key={entry.key || `credito-rural-${index}`}
                  className="border-b border-slate-800 last:border-0"
                >
                  <td className="py-2 pr-3 font-medium text-slate-100">
                    {entry.label ?? "-"}
                  </td>
                  <td className="py-2 pr-3 text-slate-300">
                    {formatDateOnly(entry.last_date)}
                  </td>
                  <td className="py-2 pr-3 text-slate-300">
                    {formatNumber(entry.last_value)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}