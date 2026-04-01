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

/** Mesmas legendas de série do gráfico IIS (tooltips em português) */
const SERIE_FAIXA_HISTORICA = "Faixa Histórica";
const SERIE_MEDIA = "Média";
const SERIE_ANO_ATUAL = "Ano Atual";
const SERIE_MEDIA_REF_PRECIP = "Média de referência";
const SERIE_ACUMULADO_ANO = "Acumulado no ano";

/** Faixa histórica: área suave e mais transparente para não competir com o ano atual */
const COLOR_FAIXA_HISTORICA_FILL = "#64748b";
const OPACIDADE_FAIXA_HISTORICA = 0.09;

/**
 * Média — teal com traço semi-transparente; pontilhado distingue do ano atual e da faixa.
 */
const COLOR_MEDIA_STROKE = "#115e59";
const STROKE_OPACITY_MEDIA = 0.48;
const STROKE_WIDTH_MEDIA = 2.5;
/** Pontilhado (traços curtos + cap arredondado leem como pontos) */
const STROKE_MEDIA_DASHARRAY = "1 5";

const yAxisLabelTemp = {
  value: "Temperatura (°C)",
  angle: -90,
  position: "insideLeft" as const,
  offset: 8,
  style: { fill: "#78716c", fontSize: 10, fontWeight: 600 },
};

const yAxisLabelMm = {
  value: "Precipitação acumulada (mm)",
  angle: -90,
  position: "insideLeft" as const,
  offset: 8,
  style: { fill: "#78716c", fontSize: 10, fontWeight: 600 },
};

function tooltipFormatterTemp(value: unknown, name?: string): [string, string] {
  const n = name ?? "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return [`${formatNumber(value, 1)} °C`, n];
  }
  return [value == null ? "—" : String(value), n];
}

function tooltipFormatterPrecipMm(value: unknown, name?: string): [string, string] {
  const n = name ?? "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return [`${formatNumber(value, 0)} mm`, n];
  }
  return [value == null ? "—" : String(value), n];
}

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

/** Mensagem `detail` do FastAPI (string, lista de erros de validação, etc.). */
async function readFastApiErrorDetail(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") return d;
      if (Array.isArray(d)) {
        return d
          .map((item) =>
            typeof item === "object" && item !== null && "msg" in item
              ? String((item as { msg: unknown }).msg)
              : String(item)
          )
          .join(" ");
      }
    }
  } catch {
    /* corpo não-JSON */
  }
  return res.statusText || `HTTP ${res.status}`;
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
      backgroundColor: "#ffffff",
      border: "1px solid #d6d3d1",
      color: "#1c1917",
      borderRadius: "14px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    },
    labelStyle: { color: "#1c1917", fontWeight: "bold" },
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
    "#0071B9",
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
        border: "border-red-200",
        bg: "bg-red-50",
        badge: "bg-red-50 text-red-700 border-red-200",
        title: "text-red-700",
      };
    case "yellow":
      return {
        border: "border-amber-200",
        bg: "bg-amber-50",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        title: "text-amber-700",
      };
    case "green":
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        title: "text-emerald-700",
      };
    default:
      return {
        border: "border-sky-200",
        bg: "bg-sky-50",
        badge: "bg-sky-50 text-sky-700 border-sky-200",
        title: "text-sky-700",
      };
  }
}

function formatPhaseLabel(value?: string | null) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function climaTempBarClass(v?: ClimaVsMedia | null): string {
  if (v === "abaixo") return "bg-sky-500";
  if (v === "acima") return "bg-orange-500";
  if (v === "proximo") return "bg-brand-stone-500";
  return "bg-brand-stone-200";
}

function climaPrecipBarClass(v?: ClimaVsMedia | null): string {
  if (v === "abaixo") return "bg-amber-700";
  if (v === "acima") return "bg-cyan-500";
  if (v === "proximo") return "bg-brand-stone-500";
  return "bg-brand-stone-200";
}

function getIisClassColor(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "#78716c";
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
  shortLabel: string; fullLabel: string;
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

        /* Não enviar `abbrev_state` aqui: o backend filtra só por `code_muni`;
         * UF desalinhada ao mapa gerava série vazia / 404. Cultura e IIS seguem opcionais. */
        if (selectedCulture) params.set("cultura", selectedCulture);
        if (selectedIisValue != null && Number.isFinite(selectedIisValue)) {
          params.set("iis_valor", String(selectedIisValue));
        }

        const res = await fetch(
          `${API_BASE_URL}/agroclima/municipio?${params.toString()}`,
          { cache: "no-store", headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          const detail = await readFastApiErrorDetail(res);
          throw new Error(
            detail || "Falha ao carregar série agroclimática"
          );
        }
        const data: AgroClimaResponse = await res.json();
        setPayload(data);
      } catch (err) {
        console.error(err);
        setPayload(null);
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Não foi possível carregar os dados agroclimáticos. Verifique se a API está no ar e se o arquivo ERA5 municipal está em data/curated/agromet."
        );
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
    <div className="space-y-0">
      {showSelector && (
        <div className="p-8 border-b border-brand-stone-300 bg-brand-bg/50">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-2xl">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">UF</label>
              <input
                value={uf}
                readOnly
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Município</label>
              <select
                value={codeMuni}
                onChange={(e) => setCodeMuni(e.target.value)}
                disabled={loadingMunicipios}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue"
              >
                {municipios.map((item) => (
                  <option key={item.code_muni} value={item.code_muni}>
                    {item.name_muni} - {item.abbrev_state}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-8 mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 border-b border-brand-stone-300">
        <div className="p-8 border-r border-brand-stone-300 group hover:bg-white transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Município</span>
          <span className="text-2xl font-bold tracking-tighter text-brand-dark">
            {payload?.municipio?.name_muni || currentMunicipio?.name_muni || "—"}
          </span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">
            {payload?.municipio?.abbrev_state || currentMunicipio?.abbrev_state || "—"} · {payload?.municipio?.code_muni || currentMunicipio?.code_muni || "—"}
          </span>
        </div>
        <div className="p-8 border-r border-brand-stone-300 group hover:bg-white transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Último Mês</span>
          <span className="text-2xl font-bold tracking-tighter text-brand-dark">
            {latestMonthRow?.monthLabel || "—"} {latestMonthRow?.year || ""}
          </span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">Janela mensal comparativa</span>
        </div>
        <div className="p-8 border-r border-brand-stone-300 group hover:bg-white transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Temp. Média</span>
          <span className="text-2xl font-bold tracking-tighter text-brand-dark">
            {formatNumber(latestMonthRow?.temp_mean, 2)} °C
          </span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">
            Min {formatNumber(latestMonthRow?.temp_min, 2)} · Max {formatNumber(latestMonthRow?.temp_max, 2)}
          </span>
        </div>
        <div className="p-8 group hover:bg-white transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Precip. Mensal</span>
          <span className="text-2xl font-bold tracking-tighter text-brand-dark">
            {formatNumber(latestMonthRow?.precip_sum, 2)} mm
          </span>
          <span className="text-[9px] text-brand-stone-400 block mt-2">Agregado mensal corrigido</span>
        </div>
      </div>

      {/* Diagnostic Section */}
      <div className={`grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300 ${insightTone.bg}`}>
        <div className="col-span-1 md:col-span-4 p-8 border-r border-brand-stone-300">
          <div className="mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-1">Diagnóstico</span>
            <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Status Climático</h3>
          </div>
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${insightTone.border} bg-white shadow-sm`}>
              <span className="text-[9px] font-bold uppercase text-brand-stone-600 block mb-1">Leitura Atual</span>
              <span className={`text-2xl font-bold ${insightTone.title}`}>{climateInsight?.status ?? "—"}</span>
            </div>
            <p className="text-xs leading-relaxed text-brand-stone-600">
              {climateInsight?.summary ?? "Aguardando dados para diagnóstico automático."}
            </p>
          </div>
        </div>
        <div className="col-span-1 md:col-span-8 p-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-4">Drivers da Leitura</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(climateInsight?.drivers || []).map((driver) => (
              <div key={driver} className="rounded-xl border border-brand-stone-300 bg-white/50 px-4 py-3 text-sm text-brand-stone-600">
                {driver}
              </div>
            ))}
            {!climateInsight && <div className="text-xs text-brand-stone-400">Processando drivers...</div>}
          </div>
        </div>
      </div>

      {/* Fenologia Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-4 p-8 border-r border-brand-stone-300 bg-brand-bg/30">
          <div className="mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-1">Fenologia</span>
            <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Calendário CONAB</h3>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Cultura</label>
              <select
                value={selectedCulture}
                onChange={(e) => setSelectedCulture(e.target.value)}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue"
              >
                {culturasOpcoes.map((o) => (
                  <option key={o.cultura} value={o.cultura}>{o.label}</option>
                ))}
              </select>
            </div>
            {fenologiaPayload && (
              <div className="p-4 rounded-xl border border-brand-stone-300 bg-white shadow-sm">
                <span className="text-[9px] font-bold uppercase text-brand-stone-600 block mb-1">Fase Atual</span>
                <span className="text-lg font-bold text-brand-dark">{formatPhaseLabel(fenologiaPayload.fase_atual)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="col-span-1 md:col-span-8 p-8">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {fenologiaHeatmap.map((cell) => (
              <div key={cell.month} className="space-y-1">
                <div className="text-center text-[9px] font-bold uppercase text-brand-stone-400">{cell.monthLabel}</div>
                <div className={`h-16 rounded-lg border flex flex-col items-center justify-center text-[10px] font-bold transition-all ${cell.isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-brand-stone-200 bg-brand-bg/50 text-brand-stone-400'}`}>
                  {cell.shortLabel}
                  {cell.isActive && cell.climaDisponivel && (
                    <div className="mt-1 flex flex-col gap-0.5 w-full px-1">
                      <div className={`h-1 rounded-full w-full ${climaTempBarClass(cell.tempVs)}`} />
                      <div className={`h-1 rounded-full w-full ${climaPrecipBarClass(cell.precipVs)}`} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-brand-stone-200 bg-white/80 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-3">
              Legenda — ciclo fenológico (CONAB)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {CONAB_FASE_LEGENDA.map((item) => (
                <div
                  key={item.sigla}
                  className="flex items-start gap-2 text-[10px] leading-snug text-brand-stone-600"
                >
                  <span className="shrink-0 rounded bg-brand-bg px-1.5 py-0.5 font-bold tabular-nums text-brand-dark ring-1 ring-brand-stone-200">
                    {item.sigla}
                  </span>
                  <span>{item.nome}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-300" />
              <span className="text-[10px] text-brand-stone-600 uppercase font-bold">Fase Ativa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded-full bg-orange-500" />
              <span className="text-[10px] text-brand-stone-600 uppercase font-bold">Temp. Acima</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded-full bg-cyan-500" />
              <span className="text-[10px] text-brand-stone-600 uppercase font-bold">Precip. Acima</span>
            </div>
          </div>
        </div>
      </div>

      {/* IIS History Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-8 p-8 border-r border-brand-stone-300">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-1 block">Índice Integrado de Seca</span>
              <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Histórico IIS — {selectedWindowLabel}</h3>
            </div>
            <span className="text-[9px] font-mono text-brand-stone-400">{iisAvailabilityText}</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={iisGeoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis domain={[1, 6]} tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v, 1)} />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Area
                  dataKey="bandRange"
                  fill={COLOR_FAIXA_HISTORICA_FILL}
                  fillOpacity={OPACIDADE_FAIXA_HISTORICA}
                  stroke="none"
                  name="Faixa Histórica"
                />
                <Line
                  dataKey="histAvg"
                  stroke={COLOR_MEDIA_STROKE}
                  strokeOpacity={STROKE_OPACITY_MEDIA}
                  strokeWidth={STROKE_WIDTH_MEDIA}
                  strokeDasharray={STROKE_MEDIA_DASHARRAY}
                  strokeLinecap="round"
                  dot={false}
                  name="Média"
                />
                <Line dataKey="current" stroke={selectedWindowColor} strokeWidth={3} dot={false} name="Ano Atual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-1 md:col-span-4 p-8 bg-brand-bg/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-4 block">Snapshot IIS</span>
          <div className="h-[200px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={iisBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis domain={[1, 6]} hide />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {iisBars.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-4 rounded-xl border border-brand-stone-300 bg-white shadow-sm">
            <span className="text-[9px] font-bold uppercase text-brand-stone-600 block mb-1">Leitura Destacada</span>
            <span className="text-3xl font-bold text-brand-dark">{formatNumber(selectedIisValue, 1)}</span>
            <span className="text-[10px] font-bold uppercase text-brand-stone-400 block mt-1">{getIisLabel(selectedIisValue)}</span>
          </div>
        </div>
      </div>

      {/* Climate Envelopes */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-4 p-8 border-r border-brand-stone-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-4 block">Temperatura</span>
          <h3 className="text-xl font-bold tracking-tighter text-brand-dark mb-6">Envelope Térmico Médio</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempMeanEnvelope.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis
                  domain={tempMeanDomain}
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v, 1)}
                  label={yAxisLabelTemp}
                />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} formatter={tooltipFormatterTemp} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(value) => <span className="text-brand-stone-700">{value}</span>} />
                <Area
                  dataKey="bandRange"
                  fill={COLOR_FAIXA_HISTORICA_FILL}
                  fillOpacity={OPACIDADE_FAIXA_HISTORICA}
                  stroke="none"
                  name={SERIE_FAIXA_HISTORICA}
                />
                <Line
                  dataKey="histAvg"
                  stroke={COLOR_MEDIA_STROKE}
                  strokeOpacity={STROKE_OPACITY_MEDIA}
                  strokeWidth={STROKE_WIDTH_MEDIA}
                  strokeDasharray={STROKE_MEDIA_DASHARRAY}
                  strokeLinecap="round"
                  dot={false}
                  name={SERIE_MEDIA}
                />
                <Line dataKey="current" stroke="#0071B9" strokeWidth={2.5} dot={false} name={SERIE_ANO_ATUAL} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-1 md:col-span-4 p-8 border-r border-brand-stone-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-4 block">Temperatura</span>
          <h3 className="text-xl font-bold tracking-tighter text-brand-dark mb-6">Mínimas Históricas</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempMinEnvelope.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis
                  domain={tempMinDomain}
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v, 1)}
                  label={yAxisLabelTemp}
                />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} formatter={tooltipFormatterTemp} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(value) => <span className="text-brand-stone-700">{value}</span>} />
                <Area
                  dataKey="bandRange"
                  fill={COLOR_FAIXA_HISTORICA_FILL}
                  fillOpacity={OPACIDADE_FAIXA_HISTORICA}
                  stroke="none"
                  name={SERIE_FAIXA_HISTORICA}
                />
                <Line
                  dataKey="histAvg"
                  stroke={COLOR_MEDIA_STROKE}
                  strokeOpacity={STROKE_OPACITY_MEDIA}
                  strokeWidth={STROKE_WIDTH_MEDIA}
                  strokeDasharray={STROKE_MEDIA_DASHARRAY}
                  strokeLinecap="round"
                  dot={false}
                  name={SERIE_MEDIA}
                />
                <Line dataKey="current" stroke="#38BDF8" strokeWidth={2.5} dot={false} name={SERIE_ANO_ATUAL} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-1 md:col-span-4 p-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-4 block">Temperatura</span>
          <h3 className="text-xl font-bold tracking-tighter text-brand-dark mb-6">Máximas Históricas</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempMaxEnvelope.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis
                  domain={tempMaxDomain}
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v, 1)}
                  label={yAxisLabelTemp}
                />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} formatter={tooltipFormatterTemp} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(value) => <span className="text-brand-stone-700">{value}</span>} />
                <Area
                  dataKey="bandRange"
                  fill={COLOR_FAIXA_HISTORICA_FILL}
                  fillOpacity={OPACIDADE_FAIXA_HISTORICA}
                  stroke="none"
                  name={SERIE_FAIXA_HISTORICA}
                />
                <Line
                  dataKey="histAvg"
                  stroke={COLOR_MEDIA_STROKE}
                  strokeOpacity={STROKE_OPACITY_MEDIA}
                  strokeWidth={STROKE_WIDTH_MEDIA}
                  strokeDasharray={STROKE_MEDIA_DASHARRAY}
                  strokeLinecap="round"
                  dot={false}
                  name={SERIE_MEDIA}
                />
                <Line dataKey="current" stroke="#F43F5E" strokeWidth={2.5} dot={false} name={SERIE_ANO_ATUAL} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-12 p-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-4 block">Precipitação</span>
          <h3 className="text-xl font-bold tracking-tighter text-brand-dark mb-6">Acumulado anual × média de referência</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={precipAccumComparison.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis
                  domain={precipAccumDomain}
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v, 0)}
                  label={yAxisLabelMm}
                />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} formatter={tooltipFormatterPrecipMm} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(value) => <span className="text-brand-stone-700">{value}</span>} />
                <Line
                  dataKey="mean"
                  stroke={COLOR_MEDIA_STROKE}
                  strokeOpacity={STROKE_OPACITY_MEDIA}
                  strokeWidth={STROKE_WIDTH_MEDIA}
                  strokeDasharray={STROKE_MEDIA_DASHARRAY}
                  strokeLinecap="round"
                  dot={false}
                  name={SERIE_MEDIA_REF_PRECIP}
                />
                <Line dataKey="current" stroke="#0071B9" strokeWidth={3} dot={false} name={SERIE_ACUMULADO_ANO} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}