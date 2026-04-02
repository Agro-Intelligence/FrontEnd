"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base";
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

const API_BASE_URL = getApiBaseUrl();

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

type MacroNewsItem = {
  title: string;
  link: string;
  summary: string | null;
  published: string | null;
  source: string;
  region: "br" | "global";
};

type MacroNewsResponse = {
  fetched_at: string;
  aggregator?: string;
  focus?: string[];
  feed_axes?: string[];
  items: MacroNewsItem[];
  unavailable_sources?: string[] | null;
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

function formatNewsDate(value?: string | null): string {
  if (!value) return "";
  const t = Date.parse(value);
  if (!Number.isNaN(t)) {
    return new Date(t).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return value.slice(0, 16);
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
      backgroundColor: "#ffffff",
      border: "1px solid #d6d3d1",
      color: "#1c1917",
      borderRadius: "14px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    },
    labelStyle: { color: "#1c1917", fontWeight: "bold" },
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
      return "bg-red-50 text-red-700 border-red-200";
    case "pro_export":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export default function MacroCreditoAgroPanel() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [regime, setRegime] = useState<RegimeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [news, setNews] = useState<MacroNewsResponse | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setNewsError(null);
        setNewsLoading(true);
        const res = await fetch(`${API_BASE_URL}/macro-credito-agro/news?limit=20`);
        if (!res.ok) throw new Error("Não foi possível carregar as notícias.");
        const data: MacroNewsResponse = await res.json();
        if (!cancelled) setNews(data);
      } catch (e) {
        if (!cancelled) {
          setNewsError(
            e instanceof Error ? e.message : "Falha ao carregar notícias."
          );
        }
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const newsBr = useMemo(
    () => news?.items.filter((i) => i.region === "br") ?? [],
    [news]
  );
  const newsGlobal = useMemo(
    () => news?.items.filter((i) => i.region === "global") ?? [],
    [news]
  );

  return (
    <div className="space-y-0">
      {panelError && (
        <div className="mx-8 mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {panelError}
        </div>
      )}

      {loading && (
        <div className="p-8 flex items-center gap-3 text-xs text-brand-stone-600">
          <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          Carregando Macro & Crédito Agro...
        </div>
      )}

      {/* Overview Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-5 border-b border-stone-300">
        <div className="p-8 border-r border-stone-300 group hover:bg-white transition-colors">
          <span className="ds-field-label block mb-2">{cards?.selic.label ?? "SELIC"}</span>
          <span className="text-3xl font-bold tracking-tighter text-brand-dark">{formatNumber(cards?.selic.last_value)}%</span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">Ref: {formatDateOnly(cards?.selic.last_date)}</span>
        </div>
        <div className="p-8 border-r border-stone-300 group hover:bg-white transition-colors">
          <span className="ds-field-label block mb-2">{cards?.usd.label ?? "USD/BRL"}</span>
          <span className="text-3xl font-bold tracking-tighter text-brand-dark">{formatNumber(cards?.usd.last_value)}</span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">Ref: {formatDateOnly(cards?.usd.last_date)}</span>
        </div>
        <div className="p-8 border-r border-stone-300 group hover:bg-white transition-colors">
          <span className="ds-field-label block mb-2">IPCA Focus</span>
          <span className="text-3xl font-bold tracking-tighter text-brand-dark">{formatNumber(cards?.ipca_expectation.last_value)}%</span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">Ref: {formatDateOnly(cards?.ipca_expectation.last_date)}</span>
        </div>
        <div className="p-8 border-r border-stone-300 group hover:bg-white transition-colors">
          <span className="ds-field-label block mb-2">PF Crédito Rural</span>
          <span className="text-3xl font-bold tracking-tighter text-brand-dark">{formatNumber(cards?.pf_credito_rural_total.last_value)}%</span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">Ref: {formatDateOnly(cards?.pf_credito_rural_total.last_date)}</span>
        </div>
        <div className="p-8 group hover:bg-white transition-colors">
          <span className="ds-field-label block mb-2">PJ Crédito Rural</span>
          <span className="text-3xl font-bold tracking-tighter text-brand-dark">{formatNumber(cards?.pj_credito_rural_total.last_value)}%</span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">Ref: {formatDateOnly(cards?.pj_credito_rural_total.last_date)}</span>
        </div>
      </div>

      {/* Notícias — crédito rural / agronegócio / macro */}
      <div className="border-b border-stone-300 bg-stone-100/40">
        <div className="p-8 pb-6">
          <span className="ds-field-label block mb-1">
            Notícias
          </span>
          <h3 className="text-xl font-bold tracking-tighter text-brand-dark">
            Agro, economia e mercado
          </h3>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-10 sm:gap-y-4">
            <div>
              <span className="ds-field-label mb-1 block">Fonte</span>
              <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                {news?.aggregator ?? "google_news_rss"}
              </span>
            </div>
            {news?.focus && news.focus.length > 0 && (
              <div className="min-w-0 max-w-3xl flex-1">
                <span className="ds-field-label mb-2 block">Eixos</span>
                <div className="flex flex-wrap gap-2">
                  {news.focus.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {news?.fetched_at && (
            <p className="mt-1 text-[10px] font-mono text-brand-stone-400">
              Coletado em {formatNewsDate(news.fetched_at)}
            </p>
          )}
        </div>

        {newsError && (
          <div className="px-8 pb-4 text-xs text-amber-800 bg-amber-50/80 border-t border-amber-100">
            {newsError}
          </div>
        )}

        {!newsError && !newsLoading && news && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t border-stone-200">
            <div className="border-b lg:border-b-0 lg:border-r border-stone-200 p-8 pt-6">
              <span className="ds-field-label mb-4 block text-brand-blue">
                Brasil
              </span>
              <ul className="space-y-4">
                {newsBr.slice(0, 12).map((item) => (
                  <li key={item.link} className="group">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium text-brand-dark leading-snug hover:text-brand-blue transition-colors"
                    >
                      {item.title}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-brand-stone-500">
                      <span>{item.source}</span>
                      {item.published && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{formatNewsDate(item.published)}</span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {newsBr.length === 0 && (
                <p className="text-xs text-brand-stone-500">Nenhuma notícia nesta coluna.</p>
              )}
            </div>
            <div className="p-8 pt-6">
              <span className="ds-field-label mb-4 block">
                Mundo
              </span>
              <ul className="space-y-4">
                {newsGlobal.slice(0, 12).map((item) => (
                  <li key={item.link} className="group">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium text-brand-dark leading-snug hover:text-brand-blue transition-colors"
                    >
                      {item.title}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-brand-stone-500">
                      <span>{item.source}</span>
                      {item.published && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{formatNewsDate(item.published)}</span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {newsGlobal.length === 0 && (
                <p className="text-xs text-brand-stone-500">Nenhuma notícia nesta coluna.</p>
              )}
            </div>
          </div>
        )}

        {newsLoading && (
          <div className="px-8 pb-8 flex items-center gap-2 text-xs text-brand-stone-500">
            <div className="w-3 h-3 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            Carregando notícias…
          </div>
        )}

        {news?.unavailable_sources && news.unavailable_sources.length > 0 && (
          <p className="px-8 pb-6 text-[10px] text-brand-stone-400">
            Alguns feeds não responderam: {news.unavailable_sources.join(", ")}.
          </p>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
        <div className="col-span-1 md:col-span-6 p-8 border-r border-stone-300">
          <div className="mb-6">
            <span className="ds-field-label block mb-1">Taxa de Juros</span>
            <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Série SELIC</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selicChartData}>
                <defs>
                  <linearGradient id="selicFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={EMERALD} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} tickFormatter={formatShortDate} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis domain={selicYDomain} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Area type="monotone" dataKey="value" name="SELIC" stroke={EMERALD} fill="url(#selicFill)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-1 md:col-span-6 p-8">
          <div className="mb-6">
            <span className="ds-field-label block mb-1">Câmbio</span>
            <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">USD / BRL</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usdChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} tickFormatter={formatShortDate} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis domain={usdYDomain} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Line type="monotone" dataKey="value" name="USD/BRL" stroke={SKY} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* IPCA Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
        <div className="col-span-1 md:col-span-4 border-r border-stone-300 bg-stone-100/60 p-8">
          <div className="mb-8">
            <span className="ds-field-label block mb-1">Expectativas Focus</span>
            <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">IPCA {overview?.ipca_reference_year}</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-stone-300 bg-white shadow-sm">
              <span className="ds-field-label mb-1 block">Última Expectativa</span>
              <span className="text-2xl font-bold text-brand-dark">{formatNumber(cards?.ipca_expectation.last_value)}%</span>
            </div>
            <p className="text-xs leading-relaxed text-brand-stone-600">
              Acompanhamento das projeções de inflação do mercado financeiro para o horizonte de política monetária.
            </p>
          </div>
        </div>
        <div className="col-span-1 md:col-span-8 p-8">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ipcaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} tickFormatter={formatShortDate} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis domain={ipcaYDomain} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Line type="monotone" dataKey="value" name="IPCA Focus" stroke={AMBER} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rural Credit Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-stone-300">
        <div className="col-span-1 md:col-span-6 p-8 border-r border-stone-300">
          <div className="mb-6">
            <span className="ds-field-label block mb-1">Crédito Rural</span>
            <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Inadimplência PF</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pfChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} tickFormatter={formatShortDate} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis domain={pfYDomain} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="pf_credito_rural_mercado" name="Mercado" stroke={EMERALD} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pf_credito_rural_regulado" name="Regulado" stroke={SKY} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pf_credito_rural_total" name="Total" stroke={SILVER} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-1 md:col-span-6 p-8">
          <div className="mb-6">
            <span className="ds-field-label block mb-1">Crédito Rural</span>
            <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Inadimplência PJ</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pjChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} tickFormatter={formatShortDate} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis domain={pjYDomain} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="pj_credito_rural_mercado" name="Mercado" stroke={ROSE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pj_credito_rural_regulado" name="Regulado" stroke={CYAN} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pj_credito_rural_total" name="Total" stroke={SILVER} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rural Credit Table Section */}
      <div className="p-8">
        <div className="mb-6">
          <span className="ds-field-label block mb-1">Detalhamento</span>
          <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Resumo de Inadimplência</h3>
        </div>
        <div className="bg-white rounded-2xl border border-stone-300 shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-300 bg-stone-100/50 text-left text-brand-stone-600">
                <th className="ds-field-label px-6 py-4 text-left">Série</th>
                <th className="ds-field-label px-6 py-4 text-left">Última Data</th>
                <th className="ds-field-label px-6 py-4 text-right">Último Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {ruralSummaryRows.map((entry, index) => (
                <tr key={entry.key || `rural-${index}`} className="transition-colors hover:bg-stone-50">
                  <td className="py-4 px-6 font-medium text-brand-dark">{entry.label}</td>
                  <td className="py-4 px-6 text-brand-stone-600">{formatDateOnly(entry.last_date)}</td>
                  <td className="py-4 px-6 text-brand-stone-600 text-right font-bold">{formatNumber(entry.last_value)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}