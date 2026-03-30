"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/** Preferir 127.0.0.1 no .env: em alguns Windows `localhost` resolve para IPv6 e o fetch falha se o API só escuta em IPv4. */
const API_BASE_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("http")) return t.replace(/\/$/, "");
  }
  return "http://127.0.0.1:8000";
})();

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const IIS_LINE_COLORS: Record<1 | 3 | 6, string> = {
  1: "#60A5FA",
  3: "#F59E0B",
  6: "#22C55E",
};

/** Legendas dos tokens usados nos códigos mensais CONAB — ordem fenológica (5=F, 6=FM) */
const CONAB_FASE_LEGENDA: { sigla: string; nome: string }[] = [
  { sigla: "PS", nome: "Pré-semeadura" },
  { sigla: "S", nome: "Semeadura" },
  { sigla: "E", nome: "Emergência" },
  { sigla: "DV", nome: "Desenvolvimento vegetativo" },
  { sigla: "F", nome: "Floração" },
  { sigla: "FM", nome: "Formação de maçãs" },
  { sigla: "EG", nome: "Enchimento de grãos" },
  { sigla: "M", nome: "Maturação" },
  { sigla: "C", nome: "Colheita" },
];

type MunicipioOption = {
  code_muni: string;
  name_muni: string;
  abbrev_state: string;
};

type AgroClimaRow = {
  date: string;
  temp_mean?: number | null;
  temp_min?: number | null;
  temp_max?: number | null;
  precip_sum?: number | null;
  precip?: number | null;
  precipitation?: number | null;
  precipitation_sum?: number | null;
  precipt?: number | null;
  precip_mm?: number | null;
  n_points?: number | null;
  year?: number;
  month?: number;
  day?: number;
  year_month?: string;
  [key: string]: unknown;
};

type ClimaVsMedia = "abaixo" | "acima" | "proximo";

type FenologiaClimaMes = {
  ano_referencia?: number | null;
  temp_vs_media?: ClimaVsMedia | null;
  precip_vs_media?: ClimaVsMedia | null;
  temp_media_ultimo_ano?: number | null;
  temp_media_climatologia?: number | null;
  precip_ultimo_ano?: number | null;
  precip_climatologia?: number | null;
};

type FenologiaCalendarioMes = {
  month?: number;
  codigo?: string | null;
  ativo?: boolean;
  rotulo_curto?: string | null;
  rotulo_completo?: string | null;
  clima?: FenologiaClimaMes | null;
};

type FenologiaPayload = {
  fase_atual?: string;
  cultura?: string;
  estado?: string;
  mes_referencia?: number | null;
  janela_fase?: {
    mes_inicio?: number | null;
    mes_fim?: number | null;
  } | null;
  /** Calendário mensal (CONAB): mês a mês com código fenológico */
  calendario_mensal?: FenologiaCalendarioMes[] | null;
  safra_referencia?: string | null;
  mesorregiao_referencia?: string | null;
  fonte_fenologia?: string | null;
  codigo_conab_mes?: string | null;
  /** Último ano usado nos comparativos climáticos do calendário */
  ano_clima_referencia?: number | null;
  clima_metodologia?: string | null;
  /** Aba da planilha CONAB (ex.: conab_plantio_municipios) */
  fonte_planilha?: string | null;
  nome_municipio_conab?: string | null;
};

type LatestMetricsPayload = {
  precip_anomalia_30d?: number | null;
  precip_acum_30d?: number | null;
  precip_anomalia_pct_30d?: number | null;
  temp_anomalia_30d?: number | null;
  temp_anomalia_same_month?: number | null;
  temp_media_30d?: number | null;
  iis_valor?: number | null;
};

type FenologiaCulturaOpcao = {
  cultura: string;
  /** Texto no seletor — coluna `cultura` CONAB (igual a `cultura`) */
  label: string;
};

type AgroClimaResponse = {
  municipio: {
    code_muni: string;
    name_muni: string;
    abbrev_state: string;
    code_state?: string;
  };
  /** Lista CONAB (aba municípios), alinhada ao IBGE resolvido na série */
  fenologia_culturas?: string[] | null;
  /** Mesmas culturas com rótulo PAM para o seletor */
  fenologia_culturas_ui?: FenologiaCulturaOpcao[] | null;
  filters?: {
    cultura?: string | null;
    code_muni?: string | null;
    abbrev_state?: string | null;
  } | null;
  summary?: {
    rows: number;
    date_min: string;
    date_max: string;
  };
  latest_metrics?: LatestMetricsPayload | null;
  fenologia?: FenologiaPayload | null;
  rows: AgroClimaRow[];
};

type IisSnapshot = {
  code_muni: string;
  name_muni: string;
  abbr_uf: string;
  iis_window?: number;
  iis_value?: number | null;
  iis_1m?: number | null;
  iis_3m?: number | null;
  iis_6m?: number | null;
};

type IisHistoryPoint = {
  ref_date: string;
  iis_1m?: number | null;
  iis_3m?: number | null;
  iis_6m?: number | null;
  iis_1m_label?: string | null;
  iis_3m_label?: string | null;
  iis_6m_label?: string | null;
};

type IisHistoryResponse = {
  municipio?: {
    code_muni: string;
    name_muni: string;
    abbr_uf?: string;
    name_uf?: string;
  } | null;
  availability?: Record<
    string,
    { start: string | null; end: string | null; points: number }
  >;
  series?: IisHistoryPoint[];
};

type Props = {
  selectedCodeMuni?: string | null;
  selectedUf?: string;
  selectedWindow?: 1 | 3 | 6;
  initialUf?: string;
  showSelector?: boolean;
  iisSnapshot?: IisSnapshot | null;
};

type MonthlyClimateRow = {
  month: number;
  monthLabel: string;
  year: number;
  temp_mean: number | null;
  temp_min: number | null;
  temp_max: number | null;
  precip_sum: number | null;
};

type MonthlyWideRow = {
  month: number;
  monthLabel: string;
  [key: string]: string | number | null;
};

type IisGeoRow = {
  month: number;
  monthLabel: string;
  histMin: number | null;
  histMax: number | null;
  histAvg: number | null;
  bandBase: number | null;
  bandRange: number | null;
  current: number | null;
};

type ClimateEnvelopeRow = {
  month: number;
  monthLabel: string;
  histMin: number | null;
  histMax: number | null;
  histAvg: number | null;
  bandBase: number | null;
  bandRange: number | null;
  current: number | null;
};

type PrecipComparisonRow = {
  month: number;
  monthLabel: string;
  mean: number | null;
  current: number | null;
  posBase: number | null;
  posGap: number | null;
  negBase: number | null;
  negGap: number | null;
};

type AgroClimateInsight = {
  status: string;
  tone: "green" | "yellow" | "red" | "blue";
  score: number;
  drivers: string[];
  summary: string;
};

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Alinha com o backend IBGE 7 dígitos (evita falha ao cruzar com CONAB). */
function normalizeIbgeMuniCode(code: string | null | undefined): string {
  if (code == null || code === "") return "";
  const s = String(code).replace(/\.0$/, "").trim();
  if (!/^\d+$/.test(s)) return s;
  return s.padStart(7, "0");
}

function normalizeIbgeDigitsLoose(code: string | null | undefined): string {
  if (code == null || code === "") return "";
  const s = String(code).replace(/\D/g, "");
  if (!s) return "";
  return s.padStart(7, "0").slice(-7);
}

/** Lista do select: ordem e tamanho vêm de `items`; rótulos de `items_ui`. Descarta JSON de outro município (corrida entre fetches). */
function parseFenologiaCulturasResponse(
  data: Record<string, unknown>,
  codeMuniExpected: string
): FenologiaCulturaOpcao[] {
  const expected = normalizeIbgeDigitsLoose(codeMuniExpected);
  const fromApi = normalizeIbgeDigitsLoose(String(data.code_muni ?? ""));
  if (expected && fromApi && fromApi !== expected) {
    return [];
  }

  const itemsRaw = data.items;
  const items_ui = Array.isArray(data.items_ui)
    ? (data.items_ui as { cultura?: unknown; label?: unknown }[])
    : [];

  const labelBy = new Map<string, string>();
  for (const row of items_ui) {
    const c = String(row?.cultura ?? "").trim();
    if (!c) continue;
    labelBy.set(c, String(row?.label ?? row.cultura ?? c).trim());
  }

  if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
    return itemsRaw
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .map((cultura) => ({
        cultura,
        label: labelBy.get(cultura) ?? cultura,
      }));
  }

  return items_ui
    .map((row) => ({
      cultura: String(row?.cultura ?? "").trim(),
      label: String(row?.label ?? row.cultura ?? "").trim(),
    }))
    .filter((o) => o.cultura);
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

function extractNumber(
  row: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function normalizeRows(rows: AgroClimaRow[]): AgroClimaRow[] {
  return rows.map((row) => ({
    ...row,
    temp_mean: extractNumber(row as Record<string, unknown>, [
      "temp_mean",
      "temp_avg",
      "temperature_mean",
    ]),
    temp_min: extractNumber(row as Record<string, unknown>, [
      "temp_min",
      "temperature_min",
    ]),
    temp_max: extractNumber(row as Record<string, unknown>, [
      "temp_max",
      "temperature_max",
    ]),
    precip_sum: extractNumber(row as Record<string, unknown>, [
      "precip_sum",
      "precip",
      "precipitation",
      "precipitation_sum",
      "precipt",
      "precip_mm",
    ]),
    year:
      row.year ??
      (row.date
        ? Number(String(row.date).slice(0, 4))
        : row.year_month
          ? Number(String(row.year_month).slice(0, 4))
          : undefined),
    month:
      row.month ??
      (row.date
        ? Number(String(row.date).slice(5, 7))
        : row.year_month
          ? Number(String(row.year_month).slice(5, 7))
          : undefined),
  }));
}

function isLikelyCumulativeSeries(values: number[]): boolean {
  if (values.length < 3) return false;

  let nonDecreasing = true;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] < values[i - 1]) {
      nonDecreasing = false;
      break;
    }
  }

  const maxVal = Math.max(...values);
  const sumVal = values.reduce((acc, value) => acc + value, 0);

  return nonDecreasing && maxVal > 0 && sumVal / maxVal > 3;
}

function buildMonthlyClimate(rows: AgroClimaRow[]): MonthlyClimateRow[] {
  const grouped = new Map<string, AgroClimaRow[]>();

  for (const row of rows) {
    const year = Number(row.year);
    const month = Number(row.month);
    if (!year || !month) continue;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const arr = grouped.get(key) || [];
    arr.push(row);
    grouped.set(key, arr);
  }

  const monthly: MonthlyClimateRow[] = [];

  for (const [key, items] of grouped.entries()) {
    const [yearStr, monthStr] = key.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    const meanVals = items
      .map((d) => d.temp_mean)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const minVals = items
      .map((d) => d.temp_min)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const maxVals = items
      .map((d) => d.temp_max)
      .filter((v): v is number => v != null && Number.isFinite(v));

    const precipByDate = new Map<string, number>();
    for (const item of items) {
      const precip = item.precip_sum;
      if (precip == null || !Number.isFinite(precip)) continue;
      const dateKey =
        item.date ||
        `${year}-${String(month).padStart(2, "0")}-${String(
          item.day ?? 1
        ).padStart(2, "0")}`;
      precipByDate.set(dateKey, precip);
    }

    const precipVals = Array.from(precipByDate.values());
    const monthlyPrecip = !precipVals.length
      ? null
      : isLikelyCumulativeSeries(precipVals)
        ? Math.max(...precipVals)
        : precipVals.reduce((acc, value) => acc + value, 0);

    monthly.push({
      year,
      month,
      monthLabel: MONTH_LABELS[month - 1] || String(month),
      temp_mean: meanVals.length
        ? meanVals.reduce((a, b) => a + b, 0) / meanVals.length
        : null,
      temp_min: minVals.length ? Math.min(...minVals) : null,
      temp_max: maxVals.length ? Math.max(...maxVals) : null,
      precip_sum:
        monthlyPrecip == null ? null : Number(monthlyPrecip.toFixed(2)),
    });
  }

  return monthly.sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year
  );
}

function buildMonthlyWide(
  rows: MonthlyClimateRow[],
  metric: "temp_mean" | "temp_min" | "temp_max" | "precip_sum"
): { data: MonthlyWideRow[]; years: number[] } {
  const years = Array.from(new Set(rows.map((r) => r.year))).sort(
    (a, b) => a - b
  );
  const data: MonthlyWideRow[] = Array.from({ length: 12 }, (_, idx) => ({
    month: idx + 1,
    monthLabel: MONTH_LABELS[idx],
  }));

  for (const row of rows) {
    data[row.month - 1][String(row.year)] =
      row[metric] == null ? null : Number(Number(row[metric]).toFixed(2));
  }

  return { data, years };
}

function buildPrecipInsight(monthlyRows: MonthlyClimateRow[]): string {
  if (!monthlyRows.length) return "Sem dados suficientes para análise.";

  const years = Array.from(new Set(monthlyRows.map((r) => r.year))).sort(
    (a, b) => a - b
  );
  const currentYear = years[years.length - 1];
  const previousYear = years.length > 1 ? years[years.length - 2] : null;
  const currentRows = monthlyRows.filter((r) => r.year === currentYear);
  const currentTotal = currentRows.reduce(
    (acc, r) => acc + (r.precip_sum ?? 0),
    0
  );

  let text = `Em ${currentYear}, o acumulado observado soma ${formatNumber(
    currentTotal,
    2
  )} mm.`;

  if (previousYear != null) {
    const prevTotal = monthlyRows
      .filter((r) => r.year === previousYear)
      .reduce((acc, r) => acc + (r.precip_sum ?? 0), 0);
    const diff = currentTotal - prevTotal;
    const direction =
      diff > 0 ? "acima" : diff < 0 ? "abaixo" : "em linha";
    text += ` Em relação a ${previousYear}, o ano atual está ${direction} em ${formatNumber(
      Math.abs(diff),
      2
    )} mm.`;
  }

  return text;
}

function makeYearColor(index: number) {
  const palette = [
    "#60A5FA",
    "#22C55E",
    "#F59E0B",
    "#A78BFA",
    "#F43F5E",
    "#06B6D4",
  ];
  return palette[index % palette.length];
}

function getWindowKey(windowValue: 1 | 3 | 6): "iis_1m" | "iis_3m" | "iis_6m" {
  return windowValue === 1
    ? "iis_1m"
    : windowValue === 3
      ? "iis_3m"
      : "iis_6m";
}

function getWindowLabel(windowValue: 1 | 3 | 6): string {
  return `${windowValue} mês${windowValue > 1 ? "es" : ""}`;
}

function getIisLabel(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return "Sem dado";
  if (value <= 1) return "Seca Excepcional";
  if (value <= 2) return "Seca Extrema";
  if (value <= 3) return "Seca Severa";
  if (value <= 4) return "Seca Moderada";
  if (value <= 5) return "Seca Fraca";
  return "Normal";
}

function buildIisGeoData(
  series: IisHistoryPoint[],
  windowValue: 1 | 3 | 6
): IisGeoRow[] {
  const key = getWindowKey(windowValue);
  const prepared = series
    .map((row) => {
      const refDate = new Date(row.ref_date);
      const rawValue = row[key];
      return {
        year: refDate.getUTCFullYear(),
        month: refDate.getUTCMonth() + 1,
        value: rawValue == null ? null : Number(rawValue),
      };
    })
    .filter((row) => row.month >= 1 && row.month <= 12);

  const years = Array.from(new Set(prepared.map((row) => row.year))).sort(
    (a, b) => a - b
  );
  const currentYear = years.length ? years[years.length - 1] : null;

  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const values = prepared
      .filter(
        (row) =>
          row.month === month &&
          row.value != null &&
          Number.isFinite(row.value)
      )
      .map((row) => row.value as number);

    const current =
      currentYear == null
        ? null
        : prepared.find(
            (row) => row.year === currentYear && row.month === month
          )?.value ?? null;

    const histMin = values.length ? Math.min(...values) : null;
    const histMax = values.length ? Math.max(...values) : null;
    const histAvg = values.length
      ? values.reduce((acc, value) => acc + value, 0) / values.length
      : null;

    return {
      month,
      monthLabel: MONTH_LABELS[idx],
      histMin,
      histMax,
      histAvg: histAvg == null ? null : Number(histAvg.toFixed(2)),
      bandBase: histMin == null ? null : Number(histMin.toFixed(2)),
      bandRange:
        histMin != null && histMax != null
          ? Number((histMax - histMin).toFixed(2))
          : null,
      current: current == null ? null : Number(current.toFixed(2)),
    };
  });
}

function buildIisRecentWide(
  series: IisHistoryPoint[],
  windowValue: 1 | 3 | 6
): { data: MonthlyWideRow[]; years: number[] } {
  const key = getWindowKey(windowValue);
  const years = Array.from(
    new Set(
      series
        .filter((row) => row[key] != null)
        .map((row) => new Date(row.ref_date).getUTCFullYear())
    )
  )
    .sort((a, b) => a - b)
    .slice(-5);

  const data: MonthlyWideRow[] = Array.from({ length: 12 }, (_, idx) => ({
    month: idx + 1,
    monthLabel: MONTH_LABELS[idx],
  }));

  for (const row of series) {
    const refDate = new Date(row.ref_date);
    const year = refDate.getUTCFullYear();
    if (!years.includes(year)) continue;
    const month = refDate.getUTCMonth() + 1;
    const rawValue = row[key];
    data[month - 1][String(year)] =
      rawValue == null ? null : Number(Number(rawValue).toFixed(2));
  }

  return { data, years };
}

function buildClimateEnvelope(
  rows: MonthlyClimateRow[],
  metric: "temp_mean" | "temp_min" | "temp_max"
): { data: ClimateEnvelopeRow[]; currentYear: number | null } {
  const years = Array.from(new Set(rows.map((r) => r.year))).sort(
    (a, b) => a - b
  );
  const currentYear = years.length ? years[years.length - 1] : null;

  const data = Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const values = rows
      .filter(
        (row) =>
          row.month === month &&
          row[metric] != null &&
          Number.isFinite(row[metric])
      )
      .map((row) => row[metric] as number);

    const current =
      currentYear == null
        ? null
        : rows.find(
            (row) => row.year === currentYear && row.month === month
          )?.[metric] ?? null;

    const histMin = values.length ? Math.min(...values) : null;
    const histMax = values.length ? Math.max(...values) : null;
    const histAvg = values.length
      ? values.reduce((acc, value) => acc + value, 0) / values.length
      : null;

    return {
      month,
      monthLabel: MONTH_LABELS[idx],
      histMin,
      histMax,
      histAvg: histAvg == null ? null : Number(histAvg.toFixed(2)),
      bandBase: histMin == null ? null : Number(histMin.toFixed(2)),
      bandRange:
        histMin != null && histMax != null
          ? Number((histMax - histMin).toFixed(2))
          : null,
      current: current == null ? null : Number(Number(current).toFixed(2)),
    };
  });

  return { data, currentYear };
}

function buildPrecipAccumComparison(
  rows: MonthlyClimateRow[]
): { data: PrecipComparisonRow[]; currentYear: number | null } {
  const years = Array.from(new Set(rows.map((r) => r.year))).sort(
    (a, b) => a - b
  );
  const currentYear = years.length ? years[years.length - 1] : null;

  const cumulativeByYear = new Map<number, Map<number, number>>();

  for (const year of years) {
    const yearRows = rows
      .filter((r) => r.year === year)
      .sort((a, b) => a.month - b.month);
    let acc = 0;
    const monthMap = new Map<number, number>();

    for (const row of yearRows) {
      acc += row.precip_sum ?? 0;
      monthMap.set(row.month, Number(acc.toFixed(2)));
    }

    cumulativeByYear.set(year, monthMap);
  }

  const data = Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;

    const values = years
      .map((year) => cumulativeByYear.get(year)?.get(month) ?? null)
      .filter((v): v is number => v != null && Number.isFinite(v));

    const mean =
      values.length > 0
        ? Number(
            (
              values.reduce((acc, value) => acc + value, 0) / values.length
            ).toFixed(2)
          )
        : null;

    const current =
      currentYear == null
        ? null
        : cumulativeByYear.get(currentYear)?.get(month) ?? null;

    const posBase = mean != null && current != null && current >= mean ? mean : null;
    const posGap =
      mean != null && current != null && current >= mean
        ? Number((current - mean).toFixed(2))
        : null;

    const negBase = mean != null && current != null && current < mean ? current : null;
    const negGap =
      mean != null && current != null && current < mean
        ? Number((mean - current).toFixed(2))
        : null;

    return {
      month,
      monthLabel: MONTH_LABELS[idx],
      mean,
      current: current == null ? null : Number(current.toFixed(2)),
      posBase,
      posGap,
      negBase,
      negGap,
    };
  });

  return { data, currentYear };
}

function getEnvelopeDomain(
  rows: ClimateEnvelopeRow[],
  options?: { padRatio?: number; minPad?: number; floorZero?: boolean }
): [number, number] {
  const padRatio = options?.padRatio ?? 0.08;
  const minPad = options?.minPad ?? 1;
  const floorZero = options?.floorZero ?? false;

  const values = rows.flatMap((row) =>
    [row.histMin, row.histMax, row.histAvg, row.current].filter(
      (v): v is number => v != null && Number.isFinite(v)
    )
  );

  if (!values.length) return floorZero ? [0, 1] : [0, 10];

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.05, minPad);
    min -= pad;
    max += pad;
  } else {
    const range = max - min;
    const pad = Math.max(range * padRatio, minPad);
    min -= pad;
    max += pad;
  }

  if (floorZero) min = Math.max(0, min);

  return [Number(min.toFixed(2)), Number(max.toFixed(2))];
}

function getWideValuesDomain(
  data: MonthlyWideRow[],
  years: number[],
  options?: { padRatio?: number; minPad?: number; floorZero?: boolean }
): [number, number] {
  const padRatio = options?.padRatio ?? 0.1;
  const minPad = options?.minPad ?? 5;
  const floorZero = options?.floorZero ?? false;

  const values = data.flatMap((row) =>
    years
      .map((year) => row[String(year)])
      .filter((v): v is number => v != null && Number.isFinite(Number(v)))
      .map((v) => Number(v))
  );

  if (!values.length) return floorZero ? [0, 100] : [0, 10];

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, minPad);
    min -= pad;
    max += pad;
  } else {
    const range = max - min;
    const pad = Math.max(range * padRatio, minPad);
    min -= pad;
    max += pad;
  }

  if (floorZero) min = Math.max(0, min);

  return [Number(min.toFixed(2)), Number(max.toFixed(2))];
}

function buildAgroClimateInsight(params: {
  precipCurrent: number | null;
  precipMean: number | null;
  tempCurrent: number | null;
  tempMean: number | null;
  iisValue: number | null;
}): AgroClimateInsight | null {
  const { precipCurrent, precipMean, tempCurrent, tempMean, iisValue } = params;

  if (
    precipCurrent == null ||
    precipMean == null ||
    tempCurrent == null ||
    tempMean == null
  ) {
    return null;
  }

  const precipPct = precipMean !== 0 ? (precipCurrent - precipMean) / precipMean : 0;
  const tempDiff = tempCurrent - tempMean;

  let score = 0;
  const drivers: string[] = [];

  if (precipPct <= -0.3) {
    score -= 2;
    drivers.push(
      `Precipitação acumulada ${formatNumber(
        Math.abs(precipPct) * 100,
        0
      )}% abaixo da média`
    );
  } else if (precipPct <= -0.1) {
    score -= 1;
    drivers.push("Precipitação acumulada abaixo da média");
  } else if (precipPct >= 0.3) {
    score += 2;
    drivers.push(
      `Precipitação acumulada ${formatNumber(precipPct * 100, 0)}% acima da média`
    );
  } else if (precipPct >= 0.1) {
    score += 1;
    drivers.push("Precipitação acumulada acima da média");
  } else {
    drivers.push("Precipitação acumulada próxima da normal climatológica");
  }

  if (tempDiff >= 4) {
    score -= 2;
    drivers.push(`Temperatura média ${formatNumber(tempDiff, 1)}°C acima da média`);
  } else if (tempDiff >= 2) {
    score -= 1;
    drivers.push("Temperatura acima da média histórica");
  } else if (tempDiff <= -2) {
    score += 1;
    drivers.push("Temperatura abaixo da média histórica");
  } else {
    drivers.push("Temperatura dentro da faixa climatológica esperada");
  }

  if (iisValue != null) {
    if (iisValue <= 2) {
      score -= 2;
      drivers.push(`IIS ${formatNumber(iisValue, 0)} em faixa crítica`);
    } else if (iisValue <= 3) {
      score -= 1;
      drivers.push(`IIS ${formatNumber(iisValue, 0)} em estado de alerta`);
    } else if (iisValue >= 5) {
      score += 1;
      drivers.push(`IIS ${formatNumber(iisValue, 0)} em condição confortável`);
    }
  }

  if (score <= -3) {
    return {
      status: "CRÍTICO SECO",
      tone: "red",
      score,
      drivers,
      summary:
        "Leitura combinada sugere estresse hídrico relevante, com risco agroclimático em elevação.",
    };
  }

  if (score <= -1) {
    return {
      status: "ALERTA",
      tone: "yellow",
      score,
      drivers,
      summary:
        "Há sinais de pressão climática. O município merece monitoramento mais próximo nas próximas leituras.",
    };
  }

  if (score >= 2) {
    return {
      status: "FAVORÁVEL",
      tone: "green",
      score,
      drivers,
      summary:
        "O conjunto clima + umidade aponta cenário relativamente benigno para o momento.",
    };
  }

  return {
    status: "NEUTRO",
    tone: "blue",
    score,
    drivers,
    summary:
      "As leituras atuais não apontam desequilíbrio climático dominante. O cenário está relativamente equilibrado.",
  };
}

function getInsightToneClasses(tone: AgroClimateInsight["tone"]) {
  switch (tone) {
    case "red":
      return {
        border: "border-red-800/70",
        bg: "bg-red-950/30",
        badge: "bg-red-950/70 text-red-300 border-red-800",
        title: "text-red-300",
      };
    case "yellow":
      return {
        border: "border-amber-800/70",
        bg: "bg-amber-950/25",
        badge: "bg-amber-950/70 text-amber-300 border-amber-800",
        title: "text-amber-300",
      };
    case "green":
      return {
        border: "border-emerald-800/70",
        bg: "bg-emerald-950/25",
        badge: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
        title: "text-emerald-300",
      };
    default:
      return {
        border: "border-sky-800/70",
        bg: "bg-sky-950/25",
        badge: "bg-sky-950/70 text-sky-300 border-sky-800",
        title: "text-sky-300",
      };
  }
}

function formatPhaseLabel(value?: string | null) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const FENOLOGIA_PANEL_TONE = {
  border: "border-slate-700/80",
  badge: "bg-slate-900/70 text-slate-300 border-slate-600",
} as const;

function climaTempBarClass(v?: ClimaVsMedia | null): string {
  if (v === "abaixo") return "bg-sky-500";
  if (v === "acima") return "bg-orange-500";
  if (v === "proximo") return "bg-slate-500";
  return "bg-slate-800";
}

function climaPrecipBarClass(v?: ClimaVsMedia | null): string {
  if (v === "abaixo") return "bg-amber-700";
  if (v === "acima") return "bg-cyan-500";
  if (v === "proximo") return "bg-slate-500";
  return "bg-slate-800";
}

function getIisClassColor(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "#475569";
  if (value <= 1) return "#B91C1C";
  if (value <= 2) return "#DC2626";
  if (value <= 3) return "#F97316";
  if (value <= 4) return "#FACC15";
  if (value <= 5) return "#84CC16";
  return "#16A34A";
}

function shortPhaseLabel(value?: string | null): string {
  const phase = (value || "").toLowerCase();
  if (!phase) return "—";
  if (phase.includes("pre_semead") || phase.includes("presemead") || phase.includes("pré-semead"))
    return "PS";
  if (phase.includes("plant")) return "PL";
  if (phase.includes("emerg")) return "EM";
  if (phase.includes("desenvol")) return "DV";
  if (phase.includes("veget")) return "VG";
  if (phase.includes("formacao_mac") || phase.includes("macas")) return "FM";
  if (phase.includes("ench")) return "EG";
  if (phase.includes("flor")) return "FL";
  if (phase.includes("matur")) return "MT";
  if (phase.includes("colh")) return "CL";
  return phase.slice(0, 2).toUpperCase();
}

type FenologiaHeatmapCell = {
  month: number;
  monthLabel: string;
  isActive: boolean;
  isCurrent: boolean;
  shortLabel: string;
  fullLabel: string;
  climaDisponivel: boolean;
  tempVs: ClimaVsMedia | null;
  precipVs: ClimaVsMedia | null;
  climaTooltip?: string;
};

function buildClimaCellTooltip(
  monthLabel: string,
  clima: FenologiaClimaMes | null | undefined
): string | undefined {
  if (!clima) return undefined;
  const bits: string[] = [];
  if (
    clima.temp_media_ultimo_ano != null &&
    clima.temp_media_climatologia != null &&
    clima.temp_vs_media
  ) {
    bits.push(
      `T média ${formatNumber(clima.temp_media_ultimo_ano, 1)}°C vs clim. ${formatNumber(
        clima.temp_media_climatologia,
        1
      )}°C (${clima.temp_vs_media})`
    );
  }
  if (
    clima.precip_ultimo_ano != null &&
    clima.precip_climatologia != null &&
    clima.precip_vs_media
  ) {
    bits.push(
      `Precip ${formatNumber(clima.precip_ultimo_ano, 0)} mm vs clim. ${formatNumber(
        clima.precip_climatologia,
        0
      )} mm (${clima.precip_vs_media})`
    );
  }
  if (clima.ano_referencia != null) {
    bits.push(`ano série: ${clima.ano_referencia}`);
  }
  if (!bits.length) return undefined;
  return `${monthLabel}: ${bits.join(" · ")}`;
}

function buildFenologiaHeatmap(fenologia?: FenologiaPayload | null): FenologiaHeatmapCell[] {
  const currentMonth = fenologia?.mes_referencia ?? null;
  const fullLabelFase = formatPhaseLabel(fenologia?.fase_atual);
  const cal = fenologia?.calendario_mensal;

  if (Array.isArray(cal) && cal.length === 12) {
    return MONTH_LABELS.map((label, idx) => {
      const month = idx + 1;
      const cell = cal[idx];
      const isActive = Boolean(cell?.ativo);
      const shortLabel =
        (cell?.rotulo_curto && String(cell.rotulo_curto).trim()) ||
        (isActive ? shortPhaseLabel(fenologia?.fase_atual) : "·");
      const fullLabel =
        (cell?.rotulo_completo && String(cell.rotulo_completo).trim()) ||
        (isActive ? fullLabelFase : "Sem estágio CONAB neste mês");
      const clim = cell?.clima;
      const climaDisponivel = Boolean(clim && (clim.temp_vs_media || clim.precip_vs_media));

      return {
        month,
        monthLabel: label,
        isActive,
        isCurrent: currentMonth === month,
        shortLabel,
        fullLabel,
        climaDisponivel,
        tempVs: (clim?.temp_vs_media as ClimaVsMedia | null) ?? null,
        precipVs: (clim?.precip_vs_media as ClimaVsMedia | null) ?? null,
        climaTooltip: buildClimaCellTooltip(label, clim ?? null),
      };
    });
  }

  const start = fenologia?.janela_fase?.mes_inicio ?? null;
  const end = fenologia?.janela_fase?.mes_fim ?? null;

  return MONTH_LABELS.map((label, idx) => {
    const month = idx + 1;
    let isActive = false;

    if (start != null && end != null) {
      if (start <= end) {
        isActive = month >= start && month <= end;
      } else {
        isActive = month >= start || month <= end;
      }
    }

    return {
      month,
      monthLabel: label,
      isActive,
      isCurrent: currentMonth === month,
      shortLabel: isActive ? shortPhaseLabel(fenologia?.fase_atual) : "·",
      fullLabel: isActive ? fullLabelFase : "Fora da janela ativa",
      climaDisponivel: false,
      tempVs: null,
      precipVs: null,
    };
  });
}

export default function AgroClimaPanel({
  selectedCodeMuni,
  selectedUf,
  selectedWindow = 3,
  initialUf = "RS",
  showSelector = false,
  iisSnapshot = null,
}: Props) {
  const [uf, setUf] = useState<string>(selectedUf || initialUf);
  const [codeMuni, setCodeMuni] = useState<string>(selectedCodeMuni || "");
  const [municipios, setMunicipios] = useState<MunicipioOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingIis, setLoadingIis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AgroClimaResponse | null>(null);
  const [iisHistory, setIisHistory] = useState<IisHistoryResponse | null>(null);
  const [culturasOpcoes, setCulturasOpcoes] = useState<FenologiaCulturaOpcao[]>(
    []
  );
  const [selectedCulture, setSelectedCulture] = useState<string>("");

  const selectedWindowKey = getWindowKey(selectedWindow);
  const selectedIisValue = iisSnapshot?.[selectedWindowKey] ?? null;

  useEffect(() => {
    if (selectedUf) setUf(selectedUf);
  }, [selectedUf]);

  useEffect(() => {
    if (selectedCodeMuni == null || selectedCodeMuni === "") {
      setCodeMuni("");
      setCulturasOpcoes([]);
      setSelectedCulture("");
      return;
    }
    setCulturasOpcoes([]);
    setCodeMuni(normalizeIbgeMuniCode(selectedCodeMuni));
    setSelectedCulture("");
  }, [selectedCodeMuni]);

  /** Lista de culturas CONAB independente da série ERA5 (evita sumir o select se /municipio falhar ou vier sem fenologia). */
  useEffect(() => {
    if (!codeMuni) return;

    let cancelled = false;

    async function loadCulturasConab() {
      try {
        const params = new URLSearchParams({
          code_muni: codeMuni,
        });
        if (uf) params.set("uf", uf);
        const res = await fetch(
          `${API_BASE_URL}/agroclima/fenologia/culturas?${params.toString()}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        );
        if (!res.ok || cancelled) return;
        const raw = (await res.json()) as Record<string, unknown>;
        const opcoes = parseFenologiaCulturasResponse(raw, codeMuni);
        if (cancelled) return;

        setCulturasOpcoes(opcoes);
        setSelectedCulture((prev) => {
          if (opcoes.length === 0) return "";
          const ids = opcoes.map((o) => o.cultura);
          if (prev && ids.includes(prev)) return prev;
          return opcoes[0].cultura;
        });
      } catch (err) {
        console.error(err);
      }
    }

    loadCulturasConab();
    return () => {
      cancelled = true;
    };
  }, [codeMuni, uf]);

  useEffect(() => {
    async function loadMunicipios() {
      if (!uf) return;
      setLoadingMunicipios(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/agroclima/municipios?uf=${encodeURIComponent(uf)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Falha ao carregar municípios");
        const data = await res.json();
        setMunicipios(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMunicipios(false);
      }
    }
    loadMunicipios();
  }, [uf]);

  useEffect(() => {
    if (!codeMuni) {
      setPayload(null);
      setCulturasOpcoes([]);
      setSelectedCulture("");
      setLoading(false);
      setError(null);
      return;
    }

    async function loadSerie() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          code_muni: codeMuni,
        });

        if (uf) params.set("abbrev_state", uf);
        if (selectedCulture) params.set("cultura", selectedCulture);
        if (selectedIisValue != null && Number.isFinite(selectedIisValue)) {
          params.set("iis_valor", String(selectedIisValue));
        }

        const res = await fetch(
          `${API_BASE_URL}/agroclima/municipio?${params.toString()}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Falha ao carregar série agroclimática");
        const data: AgroClimaResponse = await res.json();
        setPayload(data);
      } catch (err) {
        console.error(err);
        setPayload(null);
        setError("Não foi possível carregar os dados agroclimáticos.");
      } finally {
        setLoading(false);
      }
    }
    loadSerie();
  }, [
    uf,
    codeMuni,
    selectedCulture,
    selectedIisValue,
    iisSnapshot,
    selectedWindow,
  ]);

  useEffect(() => {
    async function loadIisHistory() {
      if (!codeMuni) {
        setIisHistory(null);
        return;
      }

      setLoadingIis(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/monitoramento-risco-agro/iis-historico?code_muni=${encodeURIComponent(
            codeMuni
          )}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          setIisHistory(null);
          return;
        }

        const data = await res.json();
        setIisHistory(data);
      } catch (err) {
        console.error(err);
        setIisHistory(null);
      } finally {
        setLoadingIis(false);
      }
    }

    loadIisHistory();
  }, [codeMuni]);

  const climateRows = useMemo(() => normalizeRows(payload?.rows || []), [payload]);
  const monthlyClimate = useMemo(
    () => buildMonthlyClimate(climateRows),
    [climateRows]
  );

  const tempMeanWide = useMemo(
    () => buildMonthlyWide(monthlyClimate, "temp_mean"),
    [monthlyClimate]
  );
  const precipWide = useMemo(
    () => buildMonthlyWide(monthlyClimate, "precip_sum"),
    [monthlyClimate]
  );
  const precipInsight = useMemo(
    () => buildPrecipInsight(monthlyClimate),
    [monthlyClimate]
  );

  const tempMeanEnvelope = useMemo(
    () => buildClimateEnvelope(monthlyClimate, "temp_mean"),
    [monthlyClimate]
  );
  const tempMinEnvelope = useMemo(
    () => buildClimateEnvelope(monthlyClimate, "temp_min"),
    [monthlyClimate]
  );
  const tempMaxEnvelope = useMemo(
    () => buildClimateEnvelope(monthlyClimate, "temp_max"),
    [monthlyClimate]
  );
  const precipAccumComparison = useMemo(
    () => buildPrecipAccumComparison(monthlyClimate),
    [monthlyClimate]
  );

  const tempMeanDomain = useMemo(
    () => getEnvelopeDomain(tempMeanEnvelope.data, { padRatio: 0.08, minPad: 0.8 }),
    [tempMeanEnvelope]
  );
  const tempMinDomain = useMemo(
    () => getEnvelopeDomain(tempMinEnvelope.data, { padRatio: 0.08, minPad: 0.8 }),
    [tempMinEnvelope]
  );
  const tempMaxDomain = useMemo(
    () => getEnvelopeDomain(tempMaxEnvelope.data, { padRatio: 0.08, minPad: 0.8 }),
    [tempMaxEnvelope]
  );
  const precipMonthlyDomain = useMemo(
    () =>
      getWideValuesDomain(precipWide.data, precipWide.years, {
        padRatio: 0.12,
        minPad: 10,
        floorZero: true,
      }),
    [precipWide]
  );
  const precipAccumDomain = useMemo(() => {
    const values = precipAccumComparison.data.flatMap((row) =>
      [row.mean, row.current].filter(
        (v): v is number => v != null && Number.isFinite(v)
      )
    );

    if (!values.length) return [0, 100] as [number, number];

    let min = Math.min(...values);
    let max = Math.max(...values);

    const range = max - min || 50;
    const pad = Math.max(range * 0.12, 20);

    min = Math.max(0, min - pad);
    max = max + pad;

    return [Number(min.toFixed(2)), Number(max.toFixed(2))] as [number, number];
  }, [precipAccumComparison]);

  const currentMunicipio = useMemo(
    () => municipios.find((m) => m.code_muni === codeMuni) || null,
    [municipios, codeMuni]
  );

  const latestYear = tempMeanWide.years.length
    ? tempMeanWide.years[tempMeanWide.years.length - 1]
    : null;

  const latestMonthRow = latestYear
    ? monthlyClimate.filter((r) => r.year === latestYear).slice(-1)[0]
    : null;

  const iisBars = useMemo(() => {
    if (!iisSnapshot) return [];
    return [
      {
        label: "1m",
        value: iisSnapshot.iis_1m ?? null,
        fill: getIisClassColor(iisSnapshot.iis_1m ?? null),
      },
      {
        label: "3m",
        value: iisSnapshot.iis_3m ?? null,
        fill: getIisClassColor(iisSnapshot.iis_3m ?? null),
      },
      {
        label: "6m",
        value: iisSnapshot.iis_6m ?? null,
        fill: getIisClassColor(iisSnapshot.iis_6m ?? null),
      },
    ];
  }, [iisSnapshot]);

  const selectedWindowLabel = getWindowLabel(selectedWindow);
  const selectedWindowColor = IIS_LINE_COLORS[selectedWindow];

  const iisHistorySeries = useMemo(() => iisHistory?.series || [], [iisHistory]);
  const iisGeoData = useMemo(
    () => buildIisGeoData(iisHistorySeries, selectedWindow),
    [iisHistorySeries, selectedWindow]
  );
  const iisRecentWide = useMemo(
    () => buildIisRecentWide(iisHistorySeries, selectedWindow),
    [iisHistorySeries, selectedWindow]
  );

  const iisAvailabilityText = useMemo(() => {
    const key = `${selectedWindow}m`;
    const current = iisHistory?.availability?.[key];
    if (!current || !current.start || !current.end)
      return "Histórico ainda indisponível.";
    const start = new Date(current.start).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
    const end = new Date(current.end).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
    return `${selectedWindowLabel}: ${start} até ${end} (${current.points} pontos).`;
  }, [iisHistory, selectedWindow, selectedWindowLabel]);

  const iisGeoCurrentYear = useMemo(() => {
    const years = Array.from(
      new Set(iisHistorySeries.map((row) => new Date(row.ref_date).getUTCFullYear()))
    ).sort((a, b) => a - b);
    return years.length ? years[years.length - 1] : null;
  }, [iisHistorySeries]);

  const latestPrecipComparison = useMemo(() => {
    const valid = [...precipAccumComparison.data].filter(
      (row) => row.mean != null && row.current != null
    );
    return valid.length ? valid[valid.length - 1] : null;
  }, [precipAccumComparison]);

  const climateInsight = useMemo(() => {
    return buildAgroClimateInsight({
      precipCurrent: latestPrecipComparison?.current ?? null,
      precipMean: latestPrecipComparison?.mean ?? null,
      tempCurrent: latestMonthRow?.temp_mean ?? null,
      tempMean:
        latestMonthRow == null
          ? null
          : tempMeanEnvelope.data.find((row) => row.month === latestMonthRow.month)
              ?.histAvg ?? null,
      iisValue: selectedIisValue,
    });
  }, [
    latestPrecipComparison,
    latestMonthRow,
    tempMeanEnvelope,
    selectedIisValue,
  ]);

  const latestMetrics = payload?.latest_metrics ?? null;
  const fenologiaPayload = payload?.fenologia ?? null;
  const fenologiaHeatmap = useMemo(
    () => buildFenologiaHeatmap(fenologiaPayload),
    [fenologiaPayload]
  );

  const insightTone = getInsightToneClasses(climateInsight?.tone ?? "blue");

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Painel Agroclimático</h3>
          <p className="text-sm text-slate-400">
            IIS histórico no estilo GEOGLAM + clima mensal por ano, com leitura mais enxuta entre mapa e painel.
          </p>
        </div>

        {showSelector && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">UF</label>
              <input
                value={uf}
                readOnly
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Município</label>
              <select
                value={codeMuni}
                onChange={(e) => setCodeMuni(e.target.value)}
                disabled={loadingMunicipios}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {municipios.map((item) => (
                  <option key={item.code_muni} value={item.code_muni}>
                    {item.name_muni} - {item.abbrev_state}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Município</div>
          <div className="mt-2 text-lg font-semibold text-white">
            {payload?.municipio?.name_muni || currentMunicipio?.name_muni || "—"}
          </div>
          <div className="text-sm text-slate-400">
            {payload?.municipio?.abbrev_state ||
              currentMunicipio?.abbrev_state ||
              "—"}{" "}
            · {payload?.municipio?.code_muni || currentMunicipio?.code_muni || "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Último mês</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {latestMonthRow?.monthLabel || "—"} {latestMonthRow?.year || ""}
          </div>
          <div className="text-sm text-slate-400">janela mensal comparativa</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Temp. média</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatNumber(latestMonthRow?.temp_mean, 2)} °C
          </div>
          <div className="text-sm text-slate-400">
            Min {formatNumber(latestMonthRow?.temp_min, 2)} · Max{" "}
            {formatNumber(latestMonthRow?.temp_max, 2)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Precip. mensal</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatNumber(latestMonthRow?.precip_sum, 2)} mm
          </div>
          <div className="text-sm text-slate-400">agregado mensal corrigido</div>
        </div>
      </div>

      <div
        className={`mb-4 rounded-2xl border ${insightTone.border} ${insightTone.bg} p-4 shadow-lg`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className={`text-sm font-semibold ${insightTone.title}`}>
              Diagnóstico Agroclimático
            </div>
            <div className="mt-2 text-sm text-slate-300">
              Leitura automática combinando precipitação acumulada, temperatura e IIS.
            </div>
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${insightTone.badge}`}
          >
            {climateInsight ? climateInsight.status : "Sem leitura suficiente"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {climateInsight?.status ?? "—"}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              {climateInsight?.summary ??
                "Ainda não há dados suficientes para gerar uma interpretação automática robusta."}
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Score climático</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {climateInsight ? climateInsight.score : "—"}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              Escala qualitativa para priorização de monitoramento.
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Drivers da leitura
            </div>
            <div className="mt-2 space-y-2">
              {(climateInsight?.drivers || []).slice(0, 4).map((driver) => (
                <div
                  key={driver}
                  className="rounded-xl border border-slate-800 bg-slate-800/55 px-3 py-2 text-sm text-slate-200"
                >
                  {driver}
                </div>
              ))}
              {!climateInsight && (
                <div className="rounded-xl border border-slate-800 bg-slate-800/55 px-3 py-2 text-sm text-slate-400">
                  Dados insuficientes para detalhar os fatores dominantes.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Cultura de referência
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Calendário fenológico CONAB
                    {fenologiaPayload?.safra_referencia
                      ? ` · safra ${fenologiaPayload.safra_referencia}`
                      : ""}
                    {fenologiaPayload?.nome_municipio_conab
                      ? ` · ${fenologiaPayload.nome_municipio_conab}`
                      : payload?.municipio?.name_muni && codeMuni
                        ? ` · ${payload.municipio.name_muni}`
                        : ""}
                    .
                  </p>
                </div>
                <div className="w-full shrink-0 lg:max-w-[260px]">
                  <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
                    Cultura (CONAB)
                  </label>
                  <select
                    aria-label="Cultura de referência CONAB"
                    value={
                      culturasOpcoes.some((o) => o.cultura === selectedCulture)
                        ? selectedCulture
                        : ""
                    }
                    onChange={(e) => setSelectedCulture(e.target.value)}
                    disabled={!codeMuni}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {!codeMuni && (
                      <option value="">Selecione um município no mapa…</option>
                    )}
                    {codeMuni &&
                      loading &&
                      culturasOpcoes.length === 0 && (
                        <option value="">Carregando culturas CONAB…</option>
                      )}
                    {codeMuni &&
                      !loading &&
                      culturasOpcoes.length === 0 && (
                        <option value="">
                          Nenhuma linha CONAB para o IBGE {codeMuni}
                        </option>
                      )}
                    {culturasOpcoes.map(({ cultura, label }, idx) => (
                      <option
                        key={`${codeMuni}-${idx}-${cultura}`}
                        value={cultura}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Calendário fenológico
                  </div>
                  <div
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${FENOLOGIA_PANEL_TONE.badge}`}
                  >
                    {fenologiaPayload?.ano_clima_referencia != null
                      ? `Série clima: ${fenologiaPayload.ano_clima_referencia}`
                      : "Clima vs média local"}
                  </div>
                </div>

                <div className="mb-3 rounded-xl border border-slate-800/90 bg-slate-950/55 p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Legenda — cada mês com estágio CONAB
                  </div>
                  <div className="mt-2 grid gap-3 text-[11px] text-slate-200 sm:grid-cols-2">
                    <div>
                      <div className="text-[10px] text-slate-500">Barra superior · temperatura média no mês</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-7 rounded-sm bg-sky-500" />
                          abaixo da média
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-7 rounded-sm bg-slate-500" />
                          próximo
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-7 rounded-sm bg-orange-500" />
                          acima da média
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Barra inferior · precipitação no mês</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-7 rounded-sm bg-amber-700" />
                          abaixo da média
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-7 rounded-sm bg-slate-500" />
                          próximo
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-7 rounded-sm bg-cyan-500" />
                          acima da média
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                    Comparativo do último ano com dados completos em cada mês civil frente à climatologia
                    (média de todos os anos da série neste município). Mínimo de 2 anos de histórico por mês.
                  </p>
                </div>

                <div className="mb-3 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-emerald-600/90">
                    Legenda — códigos fenológicos CONAB
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    Em cada mês ativo, o rótulo abrevia o estágio (ex.:{" "}
                    <span className="font-mono text-slate-400">S/E/DV</span>). Barras combinadas indicam mais
                    de um estágio no período.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-slate-300">
                    {CONAB_FASE_LEGENDA.map(({ sigla, nome }) => (
                      <span key={sigla} className="inline-flex items-baseline gap-1">
                        <span className="font-mono font-semibold text-emerald-400/90">{sigla}</span>
                        <span className="text-slate-500">{nome}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-1.5">
                  {fenologiaHeatmap.map((cell) => {
                    const tip = [
                      cell.isActive
                        ? `${cell.monthLabel}: ${cell.fullLabel}`
                        : `${cell.monthLabel}: sem estágio CONAB`,
                      cell.climaTooltip,
                    ]
                      .filter(Boolean)
                      .join(" — ");
                    return (
                      <div key={cell.month} className="space-y-1">
                        <div className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          {cell.monthLabel}
                        </div>
                        <div
                          title={tip}
                          className={[
                            "flex h-[4.25rem] flex-col overflow-hidden rounded-xl border text-[10px] font-semibold transition-all",
                            cell.isActive
                              ? "border-emerald-900/50 bg-slate-950/85 text-slate-100 shadow-inner shadow-black/20"
                              : "border-slate-800 bg-slate-900/40 text-slate-600",
                            cell.isCurrent ? "ring-2 ring-emerald-400/75 ring-offset-1 ring-offset-slate-950" : "",
                          ].join(" ")}
                        >
                          <div className="flex min-h-0 flex-1 items-center justify-center px-0.5 text-center leading-tight">
                            {cell.shortLabel}
                          </div>
                          {cell.isActive && cell.climaDisponivel ? (
                            <div className="mt-auto flex w-full flex-col gap-px border-t border-slate-800/90 bg-black/25 pt-px">
                              <div
                                className={`h-1.5 w-full ${climaTempBarClass(cell.tempVs)}`}
                                title={`Temperatura vs média: ${cell.tempVs ?? "—"}`}
                              />
                              <div
                                className={`h-1.5 w-full ${climaPrecipBarClass(cell.precipVs)}`}
                                title={`Precipitação vs média: ${cell.precipVs ?? "—"}`}
                              />
                            </div>
                          ) : null}
                          {cell.isActive && !cell.climaDisponivel ? (
                            <div className="border-t border-slate-800/80 py-0.5 text-center text-[8px] font-normal text-slate-500">
                              sem série
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1">
                    Meses com estágio CONAB: {fenologiaPayload?.janela_fase?.mes_inicio ?? "—"} →{" "}
                    {fenologiaPayload?.janela_fase?.mes_fim ?? "—"}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1">
                    Mês de referência: {fenologiaPayload?.mes_referencia ?? "—"}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1">
                    Fase: {formatPhaseLabel(fenologiaPayload?.fase_atual)}
                  </span>
                  {fenologiaPayload?.codigo_conab_mes ? (
                    <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1">
                      Código mês: {fenologiaPayload.codigo_conab_mes}
                    </span>
                  ) : null}
                  {fenologiaPayload?.mesorregiao_referencia ? (
                    <span
                      className="max-w-full rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1"
                      title={fenologiaPayload.mesorregiao_referencia}
                    >
                      Mesorregião: {fenologiaPayload.mesorregiao_referencia}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="xl:col-span-7">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Leitura fenológica atual
              </div>

              {fenologiaPayload ? (
                <div className={`mt-2 rounded-2xl border ${FENOLOGIA_PANEL_TONE.border} bg-slate-950/45 p-4`}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-xs text-slate-400">Cultura</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {(fenologiaPayload.cultura ?? selectedCulture) || "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-xs text-slate-400">Fase (mês de referência)</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {formatPhaseLabel(fenologiaPayload.fase_atual)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-xs text-slate-400">Código CONAB (mês ref.)</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {fenologiaPayload.codigo_conab_mes ?? "—"}
                      </div>
                    </div>
                  </div>

                  {fenologiaPayload.clima_metodologia ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                      {fenologiaPayload.clima_metodologia}
                    </p>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Métricas recentes (município)
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-slate-200">
                      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/55 px-3 py-2">
                        <span>Anomalia precip. (30d vs média)</span>
                        <span>
                          {formatNumber(
                            latestMetrics?.precip_anomalia_pct_30d ?? latestMetrics?.precip_anomalia_30d,
                            1
                          )}
                          %
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/55 px-3 py-2">
                        <span>Anomalia temp. (dia vs média do mês)</span>
                        <span>
                          {formatNumber(
                            latestMetrics?.temp_anomalia_same_month ?? latestMetrics?.temp_anomalia_30d,
                            2
                          )}
                          °C
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/55 px-3 py-2">
                        <span>IIS usado</span>
                        <span>{formatNumber(latestMetrics?.iis_valor ?? selectedIisValue, 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                  Selecione uma cultura de referência para ativar a leitura fenológica no diagnóstico.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">
                IIS histórico — {selectedWindowLabel}
              </div>
              <div className="text-xs text-slate-400">
                Faixa histórica, média e linha do ano mais recente ({iisGeoCurrentYear ?? "—"}).
              </div>
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {iisAvailabilityText}
            </div>
          </div>

          {loadingIis ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
              Carregando histórico do IIS...
            </div>
          ) : iisGeoData.some((row) => row.histAvg != null || row.current != null) ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={iisGeoData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="monthLabel" />
                <YAxis
                  domain={[1, 6]}
                  tickFormatter={(v) => formatNumber(Number(v), 0)}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  formatter={(value, name) => {
                    const label = String(name);
                    const mapNames: Record<string, string> = {
                      histAvg: "Média histórica",
                      current: `Ano ${iisGeoCurrentYear ?? "atual"}`,
                      bandRange: "Faixa histórica",
                    };
                    if (label === "bandRange") return [value ?? "—", mapNames[label]];
                    return [formatNumber(Number(value), 2), mapNames[label] ?? label];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="bandBase"
                  stackId="iis-band"
                  stroke="none"
                  fill="transparent"
                  legendType="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="bandRange"
                  stackId="iis-band"
                  stroke="none"
                  fill="#cbd5e1"
                  fillOpacity={0.18}
                  name="Faixa histórica"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="histAvg"
                  name="Média histórica"
                  stroke="#e5e7eb"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  name={`Ano ${iisGeoCurrentYear ?? "atual"}`}
                  stroke={selectedWindowColor}
                  strokeWidth={2.6}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
              O endpoint histórico do IIS ainda não retornou série suficiente para este município.
            </div>
          )}
        </div>

        <div className="xl:col-span-4 rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Snapshot do IIS</div>
            <div className="text-xs text-slate-400">
              janela ativa: {selectedWindowLabel}
            </div>
          </div>

          {iisSnapshot && iisBars.some((d) => d.value != null) ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={iisBars}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="label" />
                  <YAxis
                    domain={[1, 6]}
                    tickFormatter={(v) => formatNumber(Number(v), 0)}
                  />
                  <Tooltip
                    {...chartTooltipStyle()}
                    formatter={(v) => formatNumber(Number(v), 0)}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                    {iisBars.map((entry, index) => (
                      <Cell key={`iis-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Leitura destacada
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatNumber(selectedIisValue, 0)}
                </div>
                <div className="text-sm text-slate-300">
                  {getIisLabel(selectedIisValue)} · {selectedWindowLabel}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
              Sem snapshot do IIS para a seleção atual.
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
        <div className="mb-3 text-sm font-medium text-white">
          IIS — comparação dos últimos anos ({selectedWindowLabel})
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={iisRecentWide.data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis dataKey="monthLabel" />
            <YAxis
              domain={[1, 6]}
              tickFormatter={(v) => formatNumber(Number(v), 0)}
            />
            <Tooltip
              {...chartTooltipStyle()}
              formatter={(v) => formatNumber(Number(v), 0)}
            />
            <Legend />
            {iisRecentWide.years.map((year, idx) => (
              <Line
                key={year}
                type="monotone"
                dataKey={String(year)}
                name={String(year)}
                stroke={makeYearColor(idx)}
                strokeWidth={year === iisGeoCurrentYear ? 2.7 : 1.8}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
          O IIS de 1 mês possui histórico mais curto do que 3 e 6 meses. O gráfico respeita isso com lacunas reais, sem inventar zeros.
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-6 text-sm text-slate-400">
          Carregando painel agroclimático...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
              <div className="mb-3 text-sm font-medium text-white">
                Temperatura média mensal — faixa histórica, média e ano atual
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={tempMeanEnvelope.data}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="monthLabel" />
                  <YAxis
                    width={72}
                    domain={tempMeanDomain}
                    allowDataOverflow={true}
                    tickFormatter={(v) => `${formatNumber(Number(v), 1)}°C`}
                  />
                  <Tooltip
                    {...chartTooltipStyle()}
                    formatter={(value, name) => {
                      const label = String(name);
                      const labels: Record<string, string> = {
                        histAvg: "Média histórica",
                        current: `Ano ${tempMeanEnvelope.currentYear ?? "atual"}`,
                        bandRange: "Faixa histórica",
                      };
                      if (label === "bandRange") return [value ?? "—", labels[label]];
                      return [`${formatNumber(Number(value), 2)} °C`, labels[label] ?? label];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="bandBase"
                    stackId="temp-mean-band"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bandRange"
                    stackId="temp-mean-band"
                    stroke="none"
                    fill="#d1d5db"
                    fillOpacity={0.18}
                    name="Faixa histórica"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="histAvg"
                    name="Média histórica"
                    stroke="#e5e7eb"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    name={`Ano ${tempMeanEnvelope.currentYear ?? "atual"}`}
                    stroke="#60A5FA"
                    strokeWidth={2.6}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
              <div className="mb-3 text-sm font-medium text-white">
                Temperatura mínima mensal — faixa histórica, média e ano atual
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={tempMinEnvelope.data}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="monthLabel" />
                  <YAxis
                    width={72}
                    domain={tempMinDomain}
                    allowDataOverflow={true}
                    tickFormatter={(v) => `${formatNumber(Number(v), 1)}°C`}
                  />
                  <Tooltip
                    {...chartTooltipStyle()}
                    formatter={(value, name) => {
                      const label = String(name);
                      const labels: Record<string, string> = {
                        histAvg: "Média histórica",
                        current: `Ano ${tempMinEnvelope.currentYear ?? "atual"}`,
                        bandRange: "Faixa histórica",
                      };
                      if (label === "bandRange") return [value ?? "—", labels[label]];
                      return [`${formatNumber(Number(value), 2)} °C`, labels[label] ?? label];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="bandBase"
                    stackId="temp-min-band"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bandRange"
                    stackId="temp-min-band"
                    stroke="none"
                    fill="#d1d5db"
                    fillOpacity={0.18}
                    name="Faixa histórica"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="histAvg"
                    name="Média histórica"
                    stroke="#e5e7eb"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    name={`Ano ${tempMinEnvelope.currentYear ?? "atual"}`}
                    stroke="#A78BFA"
                    strokeWidth={2.6}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
              <div className="mb-3 text-sm font-medium text-white">
                Temperatura máxima mensal — faixa histórica, média e ano atual
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={tempMaxEnvelope.data}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="monthLabel" />
                  <YAxis
                    width={72}
                    domain={tempMaxDomain}
                    allowDataOverflow={true}
                    tickFormatter={(v) => `${formatNumber(Number(v), 1)}°C`}
                  />
                  <Tooltip
                    {...chartTooltipStyle()}
                    formatter={(value, name) => {
                      const label = String(name);
                      const labels: Record<string, string> = {
                        histAvg: "Média histórica",
                        current: `Ano ${tempMaxEnvelope.currentYear ?? "atual"}`,
                        bandRange: "Faixa histórica",
                      };
                      if (label === "bandRange") return [value ?? "—", labels[label]];
                      return [`${formatNumber(Number(value), 2)} °C`, labels[label] ?? label];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="bandBase"
                    stackId="temp-max-band"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bandRange"
                    stackId="temp-max-band"
                    stroke="none"
                    fill="#d1d5db"
                    fillOpacity={0.18}
                    name="Faixa histórica"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="histAvg"
                    name="Média histórica"
                    stroke="#e5e7eb"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    name={`Ano ${tempMaxEnvelope.currentYear ?? "atual"}`}
                    stroke="#22C55E"
                    strokeWidth={2.6}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
              <div className="mb-3 text-sm font-medium text-white">
                Precipitação mensal por ano
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={precipWide.data}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="monthLabel" />
                  <YAxis
                    width={84}
                    domain={precipMonthlyDomain}
                    tickFormatter={(v) => `${formatNumber(Number(v), 0)}mm`}
                  />
                  <Tooltip
                    {...chartTooltipStyle()}
                    formatter={(v) => `${formatNumber(Number(v), 2)} mm`}
                  />
                  <Legend />
                  {precipWide.years.map((year, idx) => (
                    <Bar
                      key={year}
                      dataKey={String(year)}
                      name={String(year)}
                      fill={makeYearColor(idx)}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
            <div className="mb-3 text-sm font-medium text-white">
              Precipitação acumulada — média acumulada x ano atual
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={precipAccumComparison.data}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="monthLabel" />
                <YAxis
                  width={84}
                  domain={precipAccumDomain}
                  tickFormatter={(v) => `${formatNumber(Number(v), 0)}mm`}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  formatter={(value, name) => {
                    const label = String(name);
                    const labels: Record<string, string> = {
                      mean: "Média acumulada",
                      current: `Ano ${precipAccumComparison.currentYear ?? "atual"}`,
                      posGap: "Acima da média",
                      negGap: "Abaixo da média",
                    };
                    return [`${formatNumber(Number(value), 2)} mm`, labels[label] ?? label];
                  }}
                />
                <Legend />

                <Area
                  type="monotone"
                  dataKey="posBase"
                  stackId="pos"
                  stroke="none"
                  fill="transparent"
                  legendType="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="posGap"
                  stackId="pos"
                  stroke="none"
                  fill="#22C55E"
                  fillOpacity={0.22}
                  name="Acima da média"
                  isAnimationActive={false}
                />

                <Area
                  type="monotone"
                  dataKey="negBase"
                  stackId="neg"
                  stroke="none"
                  fill="transparent"
                  legendType="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="negGap"
                  stackId="neg"
                  stroke="none"
                  fill="#EF4444"
                  fillOpacity={0.22}
                  name="Abaixo da média"
                  isAnimationActive={false}
                />

                <Line
                  type="monotone"
                  dataKey="mean"
                  name="Média acumulada"
                  stroke="#e5e7eb"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  name={`Ano ${precipAccumComparison.currentYear ?? "atual"}`}
                  stroke="#60A5FA"
                  strokeWidth={2.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-800/70 p-3 text-sm leading-6 text-slate-300">
              {precipInsight}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}