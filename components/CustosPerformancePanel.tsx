"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { ConabSoySummary, MacroRegionId } from "@/lib/conab-custo";
import { MACRO_REGION_COLOR, MACRO_REGION_LABEL } from "@/lib/conab-custo";
import {
  getApiBaseUrl,
  formatNetworkFetchError,
  warnIfImplicitApiBaseInProduction,
} from "@/lib/api-base";
import BrazilUfMap from "@/components/BrazilUfMap";

const API_BASE = getApiBaseUrl().replace(/\/$/, "");

type ApiOk = ConabSoySummary & {
  _meta?: { fetched_from: string; conab_url: string };
};

function formatBRL(n: number | null | undefined, maxFrac = 0): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: 0,
  });
}

function formatNum(n: number | null | undefined, frac = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    maximumFractionDigits: frac,
    minimumFractionDigits: frac,
  });
}

/** Composição típica da saca — ordens de grandeza (não vem linha a linha do arquivo CONAB). */
const COMPOSICAO_SACA_ILUSTRATIVA = [
  { name: "Fertilizantes", pct: 37.5, fill: "#14532d" },
  { name: "Defensivos", pct: 25, fill: "#15803d" },
  { name: "Sementes", pct: 15, fill: "#22c55e" },
  { name: "Diesel, máq. e manutenção", pct: 10, fill: "#86efac" },
  { name: "Mão de obra, frete, armaz. e juros", pct: 12.5, fill: "#cbd5e1" },
];

const FATORES_SUCESSO = [
  {
    n: 1,
    title: "Comprar insumos no preço certo",
    icon: "currency",
  },
  {
    n: 2,
    title: "Antecipar vendas em patamares adequados",
    icon: "handshake",
  },
  {
    n: 3,
    title: "Estrutura de capital saudável",
    icon: "shield",
  },
  {
    n: 4,
    title: "Gestão de risco e fluxo de caixa",
    icon: "chart",
  },
] as const;

function IconFatores({ kind }: { kind: (typeof FATORES_SUCESSO)[number]["icon"] }) {
  const cls = "h-5 w-5 text-stone-600";
  switch (kind) {
    case "currency":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "handshake":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m11 17 2 2a1 1 0 1 0 3-3" />
          <path d="m14 14 2.08 2.71a1 1 0 0 0 .77.42H21" />
          <path d="m18 12 1-6a1 1 0 0 0-1-1h-3.22a1 1 0 0 0-.86.49l-1.5 2.5a1 1 0 0 1-1.72 0l-1.5-2.5A1 1 0 0 0 8.22 5H5a1 1 0 0 0-1 1l1 6" />
          <path d="m7 17-2 2a1 1 0 1 1-3-3" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
  }
}

function UfChips({ summary }: { summary: ConabSoySummary }) {
  const ordem: MacroRegionId[] = [
    "centro_oeste",
    "matopiba",
    "sul",
    "outras",
  ];
  return (
    <div className="space-y-3">
      {ordem.map((rid) => {
        const ufs = summary.uf_por_regiao[rid];
        if (!ufs?.length) return null;
        return (
          <div key={rid}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
              {MACRO_REGION_LABEL[rid]}
            </p>
            <div className="flex flex-wrap gap-1">
              {ufs.map((uf) => (
                <span
                  key={`${rid}-${uf}`}
                  className="rounded border px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: MACRO_REGION_COLOR[rid], borderColor: MACRO_REGION_COLOR[rid] }}
                >
                  {uf}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CustosPerformancePanel() {
  const [data, setData] = useState<ApiOk | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    warnIfImplicitApiBaseInProduction();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${API_BASE}/conab/custo-producao`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            (j as { detail?: string }).detail || `HTTP ${res.status}`
          );
        }
        const j: ApiOk = await res.json();
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled)
          setErr(
            formatNetworkFetchError(e, "Erro ao carregar dados CONAB.")
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nacional = data?.nacional;
  const custoSacaMed = nacional?.custo_saca_mediana;
  const custoHaMed = nacional?.custo_ha_mediana;

  const ufsComDado = useMemo(() => {
    if (!data) return undefined;
    const s = new Set<string>();
    const ordem: MacroRegionId[] = [
      "centro_oeste",
      "matopiba",
      "sul",
      "outras",
    ];
    for (const r of ordem) {
      for (const u of data.uf_por_regiao[r]) {
        s.add(u);
      }
    }
    return s;
  }, [data]);

  const pieData = COMPOSICAO_SACA_ILUSTRATIVA.map((d) => ({
    name: d.name,
    value: d.pct,
    fill: d.fill,
  }));

  return (
    <div className="reveal active space-y-8 text-stone-900">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-stone-300 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative grid gap-6 p-6 md:grid-cols-5 md:p-10">
          <div className="md:col-span-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-200/90">
              Soja • Custo &amp; performance
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Radiografia de custos (CONAB)
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-emerald-50/90">
              Dados públicos de custo de produção — agricultura empresarial, unidade 60 kg —
              agregados por macrorregião. A leitura de margem comercial depende do preço de venda;
              aqui destacamos custo, produtividade implícita e remuneração do fator no arquivo.
            </p>
            {data && (
              <p className="mt-4 text-xs font-mono text-emerald-200/80">
                Referência: {data.latest_label} (série {data.latest_ano_mes})
                {data._meta?.fetched_from === "local" ? " • snapshot local" : " • CONAB online"}
              </p>
            )}
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <div className="w-full max-w-sm rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-emerald-100/90">
              <p className="font-mono uppercase tracking-wider text-emerald-300/90">Fonte</p>
              <p className="mt-2 leading-relaxed">
                {data?._meta?.conab_url || "portaldeinformacoes.conab.gov.br — CustoProducao.txt"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex items-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          Carregando agregados CONAB…
        </div>
      )}

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {/* KPIs — cenário de entrada (parcialmente ilustrativo) */}
      <section>
        <h3 className="ds-kicker mb-3">O cenário de entrada</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Mediana custo / saca",
              value: formatBRL(custoSacaMed, 0),
              sub: "Brasil — último mês da série",
            },
            {
              label: "Mediana custo / ha",
              value: formatBRL(custoHaMed, 0),
              sub: "Variável + fixo (CONAB)",
            },
            {
              label: "Crédito",
              value: "Mais seletivo",
              sub: "Leitura qualitativa de mercado",
            },
            {
              label: "Riscos",
              value: "Clima, preço e custo",
              sub: "Monitorar hedge e fluxo",
            },
            {
              label: "Produtividade (mediana)",
              value: `${formatNum(nacional?.produtividade_mediana ?? null, 0)} sc/ha`,
              sub: "Implícita no custo variável",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm transition hover:border-stone-400"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                {k.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-900">{k.value}</p>
              <p className="mt-1 text-xs text-stone-600">{k.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {data && (
        <>
          <section>
            <h3 className="ds-kicker mb-3">Radiografia regional</h3>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 overflow-x-auto rounded-xl border border-stone-300 bg-white">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 font-mono text-[10px] uppercase tracking-wider text-stone-600">
                      <th className="px-3 py-2">Região</th>
                      <th className="px-3 py-2">sc/ha</th>
                      <th className="px-3 py-2">R$/ha</th>
                      <th className="px-3 py-2">R$/sc</th>
                      <th className="px-3 py-2">Remun. fator R$/sc</th>
                      <th className="px-3 py-2 min-w-[200px]">Leitura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.regioes.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-stone-100 align-top hover:bg-stone-50/80"
                      >
                        <td className="px-3 py-3">
                          <span
                            className="inline-block h-2 w-2 rounded-full align-middle mr-2"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="font-medium">{r.label}</span>
                          <span className="ml-2 text-xs text-stone-500">n={r.n_obs}</span>
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {r.n_obs ? formatNum(r.produtividade_sc_ha, 0) : "—"}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {r.n_obs ? formatBRL(r.custo_total_ha, 0) : "—"}
                        </td>
                        <td className="px-3 py-3 tabular-nums font-medium">
                          {r.n_obs ? formatBRL(r.custo_saca_r$, 0) : "—"}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-stone-700">
                          {r.n_obs ? formatBRL(r.remun_fator_sc_r$, 0) : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-stone-600 leading-snug max-w-md">
                          {r.n_obs ? r.leitura : "Sem municípios-referência neste recorte."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-stone-300 bg-stone-50/80 p-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
                  Mapa por macrorregião
                </p>
                <p className="mt-1 text-xs text-stone-600">
                  Cores iguais à tabela. Estados fora do recorte CONAB do mês aparecem mais claros.
                </p>
                <div className="mt-4">
                  <BrazilUfMap ufsWithData={ufsComDado} />
                </div>
                <div className="mt-4 border-t border-stone-200 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500 mb-2">
                    UFs no arquivo (último mês)
                  </p>
                  <UfChips summary={data} />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4 rounded-xl border border-stone-300 bg-white p-5">
              <h4 className="text-sm font-semibold text-stone-900">
                Onde está o custo da saca?
              </h4>
              <p className="mt-1 text-xs text-stone-500">
                Composição média ilustrativa (faixas típicas de mercado — não é coluna do arquivo
                CONAB).
              </p>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={1}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`c-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number | string | undefined) =>
                        v === undefined
                          ? ""
                          : typeof v === "number"
                            ? `${v}%`
                            : String(v)
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value) => (
                        <span className="text-stone-700">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs font-semibold text-stone-700">
                Faixa indicativa de custo total / sc (série):{" "}
                {custoSacaMed != null
                  ? `${formatBRL(custoSacaMed - 15, 0)} – ${formatBRL(custoSacaMed + 15, 0)}`
                  : "—"}
              </p>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-stone-300 bg-white p-5">
              <h4 className="text-sm font-semibold text-stone-900">
                O que define o resultado
              </h4>
              <ol className="mt-4 space-y-4">
                {FATORES_SUCESSO.map((f) => (
                  <li key={f.n} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 font-mono text-xs font-bold text-stone-700">
                      {f.n}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <IconFatores kind={f.icon} />
                        <span className="text-sm font-medium text-stone-800">{f.title}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-4 flex">
              <div className="flex flex-1 flex-col justify-center rounded-xl border border-stone-800 bg-stone-900 p-6 text-stone-100">
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
                  Pergunta estratégica
                </p>
                <p className="mt-3 text-sm leading-relaxed">
                  A pergunta que importa não é só &quot;quem colhe mais&quot;, e sim{" "}
                  <span className="text-white font-medium">
                    quem ainda consegue transformar produção em caixa
                  </span>{" "}
                  com preço, custo e hedge alinhados.
                </p>
              </div>
            </div>
          </section>

          <footer className="rounded-lg bg-emerald-950 px-4 py-3 text-center text-xs text-emerald-100">
            Produtividade abre a porta. Estratégia financeira e gestão de risco sustentam o lucro.
          </footer>
        </>
      )}
    </div>
  );
}
