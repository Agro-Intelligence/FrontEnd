"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type ForwardCurveItem = {
  symbol: string;
  asset_name: string;
  reference_date: string;
  trading_date?: string;
  maturity_code: string;
  maturity_date: string;
  days_to_expiry: number;
  rank_on_curve?: number;
  settlement: number;
  curve_type?: string | null;
  source?: string | null;
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

type ForwardCurvesPanelProps = {
  data: ForwardCurveResponse | null;
  loading?: boolean;
};

type CurveChartPoint = {
  maturity_code: string;
  maturity_date: string;
  days_to_expiry: number;
  settlement: number | null;
  spot: number | null;
  price_basis: string | null;
};

function formatNumber(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInteger(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
}

function formatPercentFromFraction(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Cores alinhadas ao gráfico de forecast no portal */
const FC_SETTLEMENT = "#0071B9";
const FC_SPOT = "#F59E0B";

type TooltipPayloadEntry = {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
};

function CurveTooltip({
  active,
  payload,
  label,
  titlePrefix = "Período",
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadEntry[];
  label?: string | number;
  titlePrefix?: string;
}) {
  if (!active || !payload?.length) return null;

  const labelText = label != null ? String(label) : "";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">
        {titlePrefix}: {labelText}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? "");
          const isSpot = key === "spot" || entry.name === "Spot";
          const isSettlement =
            key === "settlement" || entry.name === "Settlement";
          const v = entry.value;
          const color = isSpot
            ? FC_SPOT
            : isSettlement
              ? FC_SETTLEMENT
              : "#1c1917";
          const num =
            typeof v === "number" ? v : v != null ? Number(v) : NaN;
          return (
            <p key={i} className="text-sm font-semibold tabular-nums" style={{ color }}>
              {entry.name} : {formatNumber(Number.isFinite(num) ? num : null, 2)}
            </p>
          );
        })}
      </div>
    </div>
  );
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

function calcPctChange(
  start?: number | null,
  end?: number | null
): number | null {
  if (
    start === null ||
    start === undefined ||
    end === null ||
    end === undefined ||
    start === 0
  ) {
    return null;
  }

  return ((end - start) / start) * 100;
}

function getCurveRegimeClass(diffPct?: number | null): string {
  if (diffPct === null || diffPct === undefined) {
    return "border-brand-stone-300 bg-brand-bg/50 text-brand-stone-600";
  }

  if (diffPct >= 1.0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (diffPct <= -1.0) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getCurveRegimeLabel(diffPct?: number | null): string {
  if (diffPct === null || diffPct === undefined) return "Sem leitura";
  if (diffPct >= 1.0) return "Contango";
  if (diffPct <= -1.0) return "Backwardation";
  return "Curva lateral";
}

function getCurveStrengthLabel(diffPct?: number | null): string {
  if (diffPct === null || diffPct === undefined) return "indefinida";

  const absPct = Math.abs(diffPct);

  if (absPct < 1) return "leve";
  if (absPct < 4) return "moderada";
  return "acentuada";
}

function buildCurveDiagnosis(items: ForwardCurveItem[]) {
  if (!items.length) {
    return {
      headline: "Sem diagnóstico disponível.",
      shortText: "Sem leitura do trecho curto.",
      longText: "Sem leitura do trecho longo.",
    };
  }

  const first = items[0];
  const last = items[items.length - 1];

  const shortSlice = items.slice(0, Math.min(3, items.length));
  const longSlice =
    items.length <= 3 ? items : items.slice(Math.max(0, items.length - 3));

  const shortFirst = shortSlice[0];
  const shortLast = shortSlice[shortSlice.length - 1];

  const longFirst = longSlice[0];
  const longLast = longSlice[longSlice.length - 1];

  const overallPct = calcPctChange(first?.settlement, last?.settlement);
  const shortPct = calcPctChange(shortFirst?.settlement, shortLast?.settlement);
  const longPct = calcPctChange(longFirst?.settlement, longLast?.settlement);

  const overallRegime = getCurveRegimeLabel(overallPct).toLowerCase();
  const overallStrength = getCurveStrengthLabel(overallPct);

  let headline = "Curva sem sinal claro.";
  if (overallRegime === "backwardation") {
    headline = `Curva em backwardation ${overallStrength}.`;
  } else if (overallRegime === "contango") {
    headline = `Curva em contango ${overallStrength}.`;
  } else {
    headline = "Curva relativamente lateral.";
  }

  let shortText = "Trecho curto sem leitura relevante.";
  if (shortPct !== null) {
    if (shortPct <= -1.0) {
      shortText =
        "Trecho curto pressionado, com inclinação negativa nos vencimentos mais próximos.";
    } else if (shortPct >= 1.0) {
      shortText =
        "Trecho curto firme, com inclinação positiva nos vencimentos mais próximos.";
    } else {
      shortText =
        "Trecho curto relativamente estável, sem inclinação forte nos primeiros vencimentos.";
    }
  }

  let longText = "Trecho longo sem leitura relevante.";
  if (longPct !== null) {
    if (Math.abs(longPct) < 1.0) {
      longText =
        "Curva longa relativamente estável, sugerindo menor dispersão entre os vencimentos distantes.";
    } else if (longPct <= -1.0) {
      longText =
        "Curva longa ainda inclinada para baixo, indicando desconto progressivo nos vencimentos mais longos.";
    } else {
      longText =
        "Curva longa inclinada para cima, indicando prêmio crescente nos vencimentos mais distantes.";
    }
  }

  return {
    headline,
    shortText,
    longText,
  };
}

export default function ForwardCurvesPanel({
  data,
  loading = false,
}: ForwardCurvesPanelProps) {
  const items = data?.items || [];

  const chartData = useMemo(
    () =>
      items.map((item) => ({
        maturity_code: item.maturity_code,
        maturity_date: item.maturity_date,
        days_to_expiry: item.days_to_expiry,
        settlement: item.settlement ?? null,
        spot: item.spot ?? null,
        price_basis: item.price_basis ?? null,
      })),
    [items]
  );

  const firstPoint = items.length ? items[0] : null;
  const lastPoint = items.length ? items[items.length - 1] : null;

  const yDomain = useMemo(
    () =>
      getSafeYDomain(
        chartData.flatMap((item) => [item.settlement, item.spot]),
        0.1
      ),
    [chartData]
  );

  const slopeAbs =
    firstPoint && lastPoint
      ? (lastPoint.settlement ?? 0) - (firstPoint.settlement ?? 0)
      : null;

  const slopePct = calcPctChange(
    firstPoint?.settlement ?? null,
    lastPoint?.settlement ?? null
  );

  const regimeLabel = getCurveRegimeLabel(slopePct);
  const diagnosis = buildCurveDiagnosis(items);

  const executiveHeadline = data?.curve_shape_label
    ? `Leitura do backend: ${data.curve_shape_label}.`
    : diagnosis.headline;

  return (
    <div className="space-y-0 bg-[#EAEAE5]">
      {/* Header Section */}
      <div className="p-8 border-b border-brand-stone-300 relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-12 gap-0 z-0 h-full w-full opacity-20">
          <div className="col-span-3 border-r border-stone-400/30 h-full"></div>
          <div className="col-span-6 border-r border-stone-400/30 h-full"></div>
          <div className="col-span-3 h-full"></div>
        </div>

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between max-w-7xl mx-auto">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-blue mb-2 block">Estrutura a Termo</span>
            <h2 className="text-5xl font-bold tracking-tighter text-brand-dark">Forward Curve</h2>
            <p className="mt-4 text-sm leading-relaxed text-brand-stone-600 max-w-md font-medium">
              Visualização da curva de preços futuros por vencimento, prêmios sobre o spot e diagnóstico de regime.
            </p>
          </div>
          {data && (
            <div className="flex flex-wrap gap-3">
              <div className={`px-5 py-2.5 rounded-full border shadow-sm flex flex-col items-center justify-center min-w-[140px] backdrop-blur-sm transition-all hover:bg-white ${getCurveRegimeClass(slopePct)}`}>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Regime</span>
                <span className="text-base font-bold">{regimeLabel}</span>
              </div>
              {data.reference_date && (
                <div className="px-5 py-2.5 rounded-full border border-brand-stone-300 bg-white/50 shadow-sm flex flex-col items-center justify-center min-w-[140px] backdrop-blur-sm hover:bg-white transition-all">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-stone-400">Referência</span>
                  <span className="text-base font-bold text-brand-dark">{data.reference_date}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-brand-stone-600">
            <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium tracking-widest uppercase">Carregando curva forward...</span>
          </div>
        </div>
      ) : !data || items.length === 0 ? (
        <div className="p-12 flex items-center justify-center min-h-[400px]">
          <div className="px-10 py-8 rounded-2xl border border-brand-stone-300 bg-white/40 text-brand-stone-400 text-sm shadow-sm backdrop-blur-md uppercase tracking-widest font-bold">
            Sem dados de curva forward para o ativo selecionado.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
          {/* Left Column: Metrics & Diagnosis */}
          <div className="col-span-1 md:col-span-4 border-r border-brand-stone-300 bg-stone-100/30">
            <div className="p-8 border-b border-brand-stone-300">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-stone-500 block mb-8">Métricas da Curva</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-brand-stone-300 bg-white/60 shadow-sm hover:bg-white transition-colors group">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-stone-400 block mb-2 group-hover:text-brand-blue transition-colors">Contratos</span>
                  <span className="text-3xl font-bold text-brand-dark tracking-tighter">{data.points_count}</span>
                </div>
                <div className="p-5 rounded-2xl border border-brand-stone-300 bg-white/60 shadow-sm hover:bg-white transition-colors group">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-stone-400 block mb-2 group-hover:text-brand-blue transition-colors">Inclinação</span>
                  <span className="text-3xl font-bold text-brand-dark tracking-tighter">{formatNumber(slopePct, 1)}%</span>
                </div>
                <div className="p-5 rounded-2xl border border-brand-stone-300 bg-white/60 shadow-sm hover:bg-white transition-colors group">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-stone-400 block mb-2 group-hover:text-brand-blue transition-colors">Spot</span>
                  <span className="text-xl font-bold text-brand-dark tracking-tight">{data.has_spot ? "Disponível" : "Indisponível"}</span>
                </div>
                <div className="p-5 rounded-2xl border border-brand-stone-300 bg-white/60 shadow-sm hover:bg-white transition-colors group">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-stone-400 block mb-2 group-hover:text-brand-blue transition-colors">Base</span>
                  <span className="text-xl font-bold text-brand-dark tracking-tight">{firstPoint?.price_basis || "BRL"}</span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/20">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-stone-500 block mb-8">Diagnóstico Executivo</span>
              <div className="space-y-8">
                <div className="p-6 rounded-2xl border border-brand-blue/10 bg-white shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue"></div>
                  <p className="text-lg font-bold text-brand-dark leading-tight group-hover:translate-x-1 transition-transform">
                    {executiveHeadline}
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="border-l border-brand-stone-300 pl-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-stone-400 block mb-2">Trecho Curto</span>
                    <p className="text-sm leading-relaxed text-brand-stone-600 font-medium">{diagnosis.shortText}</p>
                  </div>
                  <div className="border-l border-brand-stone-300 pl-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-stone-400 block mb-2">Trecho Longo</span>
                    <p className="text-sm leading-relaxed text-brand-stone-600 font-medium">{diagnosis.longText}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Chart & Table */}
          <div className="col-span-1 md:col-span-8 bg-white/10">
            <div className="p-8 border-b border-brand-stone-300">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="ds-field-label mb-2 block">Visualização gráfica</span>
                  <h3 className="text-2xl font-bold tracking-tighter text-stone-900 md:text-3xl">
                    Série de vencimentos
                  </h3>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-stone-500">
                    Mesmo formato visual do gráfico de forecast do Mercado (grade, eixos e tooltip).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-blue" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      Settlement
                    </span>
                  </div>
                  {data.has_spot && (
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        Spot
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[350px] w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="maturity_code"
                      tick={{ fontSize: 10, fill: "#78716c" }}
                      axisLine={{ stroke: "#d6d3d1" }}
                      tickLine={false}
                      dy={8}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fontSize: 10, fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatNumber(v, 2)}
                      width={52}
                    />
                    <Tooltip
                      content={(props) => (
                        <CurveTooltip {...props} titlePrefix="Vencimento" />
                      )}
                      cursor={{ stroke: "#d6d3d1", strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="settlement"
                      name="Settlement"
                      stroke={FC_SETTLEMENT}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={{
                        r: 4,
                        fill: "#ffffff",
                        stroke: FC_SETTLEMENT,
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#ffffff",
                        stroke: FC_SETTLEMENT,
                        strokeWidth: 2,
                      }}
                      connectNulls
                      isAnimationActive={false}
                    />
                    {data.has_spot && (
                      <Line
                        type="monotone"
                        dataKey="spot"
                        name="Spot"
                        stroke={FC_SPOT}
                        strokeWidth={2}
                        strokeDasharray="6 5"
                        strokeLinecap="round"
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-stone-500 block mb-8">Detalhamento por Vencimento</span>
              <div className="bg-white/80 rounded-3xl border border-brand-stone-300 shadow-xl overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-stone-300 text-left text-brand-stone-500 bg-stone-50/50">
                        <th className="py-5 px-8 font-bold uppercase tracking-widest text-[10px]">Vencimento</th>
                        <th className="py-5 px-8 font-bold uppercase tracking-widest text-[10px]">Data</th>
                        <th className="py-5 px-8 font-bold uppercase tracking-widest text-[10px] text-right">Settlement</th>
                        <th className="py-5 px-8 font-bold uppercase tracking-widest text-[10px] text-right">Prêmio/Spot</th>
                        <th className="py-5 px-8 font-bold uppercase tracking-widest text-[10px] text-right">Basis Anual.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-stone-200">
                      {items.map((row) => (
                        <tr key={row.maturity_code} className="hover:bg-white transition-colors group">
                          <td className="py-5 px-8 font-bold text-brand-dark group-hover:text-brand-blue transition-colors">{row.maturity_code}</td>
                          <td className="py-5 px-8 text-brand-stone-500 font-medium">{row.maturity_date}</td>
                          <td className="py-5 px-8 text-right text-brand-dark font-black text-base">{formatNumber(row.settlement, 2)}</td>
                          <td className="py-5 px-8 text-right font-bold">
                            <span className={`px-3 py-1 rounded-full text-[11px] ${Number(row.premium_pct_vs_spot) >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                              {formatPercentFromFraction(row.premium_pct_vs_spot, 1)}
                            </span>
                          </td>
                          <td className="py-5 px-8 text-right text-brand-stone-400 font-mono text-[11px]">
                            {formatPercentFromFraction(row.annualized_basis, 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}