"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
    return "border-slate-700 bg-slate-800/80 text-slate-300";
  }

  if (diffPct >= 1.0) {
    return "border-emerald-700 bg-emerald-950/70 text-emerald-300";
  }

  if (diffPct <= -1.0) {
    return "border-rose-700 bg-rose-950/70 text-rose-300";
  }

  return "border-amber-700 bg-amber-950/70 text-amber-300";
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

  const chartData: CurveChartPoint[] = items.map((item) => ({
    maturity_code: item.maturity_code,
    maturity_date: item.maturity_date,
    days_to_expiry: item.days_to_expiry,
    settlement: item.settlement ?? null,
    spot: item.spot ?? null,
    price_basis: item.price_basis ?? null,
  }));

  const firstPoint = items.length ? items[0] : null;
  const lastPoint = items.length ? items[items.length - 1] : null;

  const yDomain = getSafeYDomain(
    chartData.flatMap((item) => [item.settlement, item.spot]),
    0.1
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
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-100">
            Forward Curve
          </h3>
          <p className="text-sm text-slate-400">
            Estrutura a termo do ativo selecionado por vencimento.
          </p>
        </div>

        {data && (
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getCurveRegimeClass(
                slopePct
              )}`}
            >
              {regimeLabel}
            </span>

            {data.reference_date && (
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200">
                Ref: {data.reference_date}
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
          Carregando curva forward...
        </div>
      ) : !data || items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
          Sem dados de curva forward para o ativo selecionado.
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Ativo
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {data.asset_name}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Contratos
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {formatInteger(data.points_count)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Inclinação
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {formatNumber(slopeAbs, 2)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {formatNumber(slopePct, 2)}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Spot integrado
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {data.has_spot ? "Sim" : "Ainda não"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Base monetária
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {firstPoint?.price_basis || "-"}
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 xl:col-span-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Diagnóstico executivo
              </p>
              <p className="mt-2 text-base font-semibold text-slate-100">
                {executiveHeadline}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Leitura geral
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                A curva parte de {formatNumber(firstPoint?.settlement, 2)} no
                primeiro vencimento e vai para{" "}
                {formatNumber(lastPoint?.settlement, 2)} no vencimento mais
                longo, sugerindo regime de{" "}
                <span className="font-semibold text-slate-100">
                  {regimeLabel.toLowerCase()}
                </span>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Trecho curto
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {diagnosis.shortText}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Trecho longo
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {diagnosis.longText}
              </p>
            </div>
          </div>

          <div className="mb-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="maturity_code"
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 11, fill: "#cbd5e1" }}
                  tickFormatter={(value) => formatNumber(Number(value), 2)}
                />
                <Tooltip
                  {...chartTooltipStyle()}
                  formatter={(value, name, entry) => {
                    const row = entry?.payload as CurveChartPoint | undefined;
                    const basis = row?.price_basis ? ` (${row.price_basis})` : "";

                    const label =
                      String(name ?? "") === "settlement"
                        ? `Settlement${basis}`
                        : String(name ?? "") === "spot"
                        ? `Spot${basis}`
                        : String(name ?? "");

                    const safeValue =
                      value === undefined || value === null
                        ? "-"
                        : formatNumber(Number(value), 2);

                    return [safeValue, label] as [string, string];
                  }}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as
                      | CurveChartPoint
                      | undefined;
                    if (!row) return String(label);
                    return `${row.maturity_code} • ${row.days_to_expiry} dias • ${row.maturity_date}`;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="settlement"
                  name="Settlement"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  dot
                  connectNulls
                />
                {data.has_spot && (
                  <Line
                    type="monotone"
                    dataKey="spot"
                    name="Spot"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="py-2 pr-4">Vencimento</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Dias</th>
                  <th className="py-2 pr-4">Settlement</th>
                  <th className="py-2 pr-4">Spot</th>
                  <th className="py-2 pr-4">Base</th>
                  <th className="py-2 pr-4">Prêmio vs spot</th>
                  <th className="py-2 pr-4">% vs spot</th>
                  <th className="py-2 pr-4">Basis anualizada</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={`${row.symbol}-${row.maturity_code}`}
                    className="border-b border-slate-800 last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-100">
                      {row.maturity_code}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {row.maturity_date}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatInteger(row.days_to_expiry)}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatNumber(row.settlement, 2)}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatNumber(row.spot, 2)}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {row.price_basis || "-"}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatNumber(row.premium_vs_spot, 2)}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatPercentFromFraction(row.premium_pct_vs_spot, 2)}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatPercentFromFraction(row.annualized_basis, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}