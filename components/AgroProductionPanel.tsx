"use client";

import { useEffect, useMemo, useState } from "react";
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

type AgroUfItem = {
  uf: string;
  estado?: string | null;
  estado_label?: string | null;
};

type AgroCultureItem = {
  cultura: string;
  label?: string | null;
};

type AgroSafraItem = {
  safra: string;
  label?: string | null;
};

type AgroComparativoRow = {
  fonte: string;
  serie: string;
  cultura_label?: string | null;
  area_plantada?: number | null;
  producao?: number | null;
  produtividade?: number | null;
  projecao?: number | null;
};

type AgroComparativoResponse = {
  header: {
    uf: string;
    cultura: string;
    safra: string;
  };
  rows: AgroComparativoRow[];
};

type AgroHistoricoItem = {
  safra: string;
  fonte: string;
  serie: string;
  area_plantada?: number | null;
  producao?: number | null;
  produtividade?: number | null;
  projecao?: number | null;
};

type AgroHistoricoResponse = {
  items: AgroHistoricoItem[];
};

type ChartMetric = "producao" | "area_plantada" | "produtividade";

type EditorialNewsItem = {
  title?: string;
  date?: string;
  source?: string;
};

type EditorialRadarItem = {
  cultura: string;
  mentions: number;
  recent_news?: EditorialNewsItem[];
};

type EditorialRadarResponse = {
  updated_at?: string;
  items: EditorialRadarItem[];
};

type EmergingWatchItem = {
  crop?: string;
  crop_id?: string;
  categoria?: string;
  mentions?: number;
  news_count?: number;
  recent_news?: Array<{
    title?: string;
    link?: string;
    published?: string;
    source?: string;
  }>;
};

type EmergingDiscoveredItem = {
  crop?: string;
  mentions?: number;
};

type EmergingRadarResponse = {
  updated_at?: string;
  watchlist?: EmergingWatchItem[];
  discovered?: EmergingDiscoveredItem[];
};

type StatisticalRadarItem = {
  cultura: string;
  label?: string;
  categoria?: string;
  bucket?: string;
  score?: number;
  safra_atual?: string;
  safra_anterior?: string;
  producao_atual_t?: number | null;
  producao_anterior_t?: number | null;
  crescimento_producao_percent?: number | null;
  tendencia?: string;
  is_emerging_candidate?: boolean;
};

type StatisticalRadarResponse = {
  updated_at?: string;
  emergentes?: StatisticalRadarItem[];
  expansao_relevante?: StatisticalRadarItem[];
  pressao?: StatisticalRadarItem[];
};

type IoaItem = {
  cultura: string;
  label?: string;
  categoria?: string;
  bucket?: string;
  score_estatistico?: number;
  score_editorial?: number;
  score_emergente?: number;
  ioa?: number;
  faixa?: string;
  safra_atual?: string;
  crescimento_producao_percent?: number | null;
  tendencia?: string;
  interpretacao?: string;
};

type IoaResponse = {
  updated_at?: string;
  items?: IoaItem[];
};

type AgroSentimentHeadline = {
  title?: string;
  date?: string;
  source?: string;
  link?: string;
};

type AgroSentimentResponse = {
  uf: string;
  cultura: string;
  sentiment_score: number;
  sentiment_label: string;
  headline_count: number;
  top_topics: string[];
  editorial_summary: string;
  latest_headlines: AgroSentimentHeadline[];
  source?: string;
  updated_at?: string;
  matched_scope?: string;
};

type ChartPoint = {
  safra: string;
  ibge: number | null;
  conab: number | null;
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

function formatUfLabel(item?: AgroUfItem | null): string {
  if (!item) return "-";

  const uf = (item.uf || "").trim();
  const estado = (item.estado || "").trim();
  const estadoLabel = (item.estado_label || "").trim();

  if (estadoLabel) return estadoLabel;
  if (!estado) return uf;
  if (estado.toUpperCase() === uf.toUpperCase()) return uf;

  return `${estado} - ${uf}`;
}

function formatCropLabel(crop?: string | null): string {
  if (!crop) return "-";

  const map: Record<string, string> = {
    algodao: "Algodão",
    arroz: "Arroz",
    cafe: "Café",
    cana_de_acucar: "Cana-de-açúcar",
    centeio: "Centeio",
    cevada: "Cevada",
    feijao: "Feijão",
    gergelim: "Gergelim",
    girassol: "Girassol",
    milho: "Milho",
    soja: "Soja",
    sorgo: "Sorgo",
    trigo: "Trigo",
    amendoim: "Amendoim",
    aveia: "Aveia",
    canola: "Canola",
    dende_cacho_de_coco: "Dendê / Palma de Óleo",
    coco_da_baia: "Coco-da-baía",
    erva_mate_folha_verde: "Erva-mate",
    linho_semente: "Linho",
    malva_fibra: "Malva",
    juta_fibra: "Juta",
    tungue_fruto_seco: "Tungue",
    mandioca: "Mandioca",
    laranja: "Laranja",
    banana: "Banana",
    tomate: "Tomate",
    melancia: "Melancia",
    guarana_semente: "Guaraná",
    caqui: "Caqui",
    cafe_conilon: "Café Conilon",
    abacaxi: "Abacaxi",
    alho: "Alho",
    batata_inglesa_1_safra: "Batata-inglesa 1ª safra",
    batata_inglesa_3_safra: "Batata-inglesa 3ª safra",
  };

  return map[crop] || crop.replaceAll("_", " ");
}

function formatSerieLabel(serie?: string | null): string {
  if (!serie) return "-";

  const map: Record<string, string> = {
    algodao_herbaceo: "Algodão herbáceo",
    algodao_herbaceo_ibge: "Algodão herbáceo IBGE",
    algodao_pluma: "Algodão pluma",
    algodao_pluma_conab: "Algodão pluma CONAB",
    algodao_caroco: "Caroço de algodão",
    algodao_caroco_conab: "Caroço de algodão CONAB",
    milho_1a_safra: "Milho 1ª safra",
    milho_2a_safra: "Milho 2ª safra",
    feijao_1a_safra: "Feijão 1ª safra",
    feijao_2a_safra: "Feijão 2ª safra",
    feijao_3a_safra: "Feijão 3ª safra",
    amendoim_1a_safra: "Amendoim 1ª safra",
    amendoim_2a_safra: "Amendoim 2ª safra",
    soja: "Soja",
    arroz: "Arroz",
    trigo: "Trigo",
    sorgo: "Sorgo",
    girassol: "Girassol",
    gergelim: "Gergelim",
    centeio: "Centeio",
    cevada: "Cevada",
    cafe: "Café",
    cana_de_acucar: "Cana-de-açúcar",
    amendoim: "Amendoim",
    aveia: "Aveia",
    algodao: "Algodão",
    milho: "Milho",
    feijao: "Feijão",
  };

  return map[serie] || serie.replaceAll("_", " ");
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

function getMetricValue(item: AgroHistoricoItem, metric: ChartMetric): number | null {
  if (metric === "producao") return item.producao ?? null;
  if (metric === "area_plantada") return item.area_plantada ?? null;
  if (metric === "produtividade") return item.produtividade ?? null;
  return null;
}

function safraSortKey(safra: string): number {
  const first = String(safra || "").split("/")[0];
  const num = Number(first);
  return Number.isFinite(num) ? num : 999999;
}

function getBucketBadgeClass(bucket?: string | null): string {
  switch ((bucket || "").toLowerCase()) {
    case "emergente":
      return "border-emerald-800 bg-emerald-950/60 text-emerald-300";
    case "expansao_relevante":
      return "border-sky-800 bg-sky-950/60 text-sky-300";
    case "pressao":
      return "border-rose-800 bg-rose-950/60 text-rose-300";
    default:
      return "border-slate-700 bg-slate-800/80 text-slate-300";
  }
}

function getFaixaBadgeClass(faixa?: string | null): string {
  switch ((faixa || "").toLowerCase()) {
    case "muito_alta":
      return "border-emerald-700 bg-emerald-950/70 text-emerald-300";
    case "alta":
      return "border-lime-700 bg-lime-950/70 text-lime-300";
    case "moderada":
      return "border-amber-700 bg-amber-950/70 text-amber-300";
    case "neutra":
      return "border-slate-700 bg-slate-800/80 text-slate-300";
    default:
      return "border-rose-700 bg-rose-950/70 text-rose-300";
  }
}

function getIoaBarClass(ioa?: number | null): string {
  const value = Number(ioa ?? 0);

  if (value >= 80) return "bg-emerald-400";
  if (value >= 65) return "bg-lime-400";
  if (value >= 50) return "bg-amber-400";
  if (value >= 35) return "bg-slate-400";
  return "bg-rose-400";
}

function getIoaWidth(ioa?: number | null): string {
  const value = Math.max(0, Math.min(100, Number(ioa ?? 0)));
  return `${value}%`;
}

function getRankBadge(index: number): string {
  if (index === 0) return "bg-amber-500/20 text-amber-300 border-amber-700";
  if (index === 1) return "bg-slate-400/20 text-slate-200 border-slate-600";
  if (index === 2) return "bg-orange-500/20 text-orange-300 border-orange-700";
  return "bg-slate-800 text-slate-300 border-slate-700";
}

function getSummaryIconClass(kind: "opportunity" | "pressure" | "news"): string {
  if (kind === "opportunity") return "border-emerald-800 bg-emerald-950/60 text-emerald-300";
  if (kind === "pressure") return "border-rose-800 bg-rose-950/60 text-rose-300";
  return "border-sky-800 bg-sky-950/60 text-sky-300";
}

function getSentimentBadgeClass(label?: string | null): string {
  switch ((label || "").toLowerCase()) {
    case "positivo":
      return "border-emerald-700 bg-emerald-950/70 text-emerald-300";
    case "negativo":
      return "border-rose-700 bg-rose-950/70 text-rose-300";
    default:
      return "border-amber-700 bg-amber-950/70 text-amber-300";
  }
}

function formatSentimentLabel(label?: string | null): string {
  if (!label) return "Neutro";
  const map: Record<string, string> = {
    positivo: "Positivo",
    negativo: "Negativo",
    neutro: "Neutro",
  };
  return map[label.toLowerCase()] || label;
}

export default function AgroProductionPanel() {
  const [ufs, setUfs] = useState<AgroUfItem[]>([]);
  const [culturas, setCulturas] = useState<AgroCultureItem[]>([]);
  const [safras, setSafras] = useState<AgroSafraItem[]>([]);

  const [selectedUf, setSelectedUf] = useState<string>("RS");
  const [selectedCultura, setSelectedCultura] = useState<string>("");
  const [selectedSafra, setSelectedSafra] = useState<string>("");

  const [comparativo, setComparativo] =
    useState<AgroComparativoResponse | null>(null);
  const [historico, setHistorico] = useState<AgroHistoricoItem[]>([]);

  const [editorialRadar, setEditorialRadar] =
    useState<EditorialRadarResponse | null>(null);
  const [emergingRadar, setEmergingRadar] =
    useState<EmergingRadarResponse | null>(null);
  const [statisticalRadar, setStatisticalRadar] =
    useState<StatisticalRadarResponse | null>(null);
  const [ioaRadar, setIoaRadar] = useState<IoaResponse | null>(null);

  const [agroSentiment, setAgroSentiment] =
    useState<AgroSentimentResponse | null>(null);

  const [loadingUfs, setLoadingUfs] = useState(false);
  const [loadingCulturas, setLoadingCulturas] = useState(false);
  const [loadingSafras, setLoadingSafras] = useState(false);
  const [loadingComparativo, setLoadingComparativo] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [loadingAgroSentiment, setLoadingAgroSentiment] = useState(false);

  const [chartMetric, setChartMetric] = useState<ChartMetric>("producao");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function fetchUfs() {
    setLoadingUfs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/agro/producao/ufs`);
      if (!res.ok) throw new Error("Erro ao carregar estados.");

      const json = await res.json();
      const items: AgroUfItem[] = json.items || [];
      setUfs(items);

      if (items.length > 0 && !items.some((x) => x.uf === selectedUf)) {
        setSelectedUf(items[0].uf);
      }
    } finally {
      setLoadingUfs(false);
    }
  }

  async function fetchCulturas(uf: string) {
    setLoadingCulturas(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/agro/producao/culturas?uf=${encodeURIComponent(uf)}`
      );
      if (!res.ok) throw new Error(`Erro ao carregar culturas para ${uf}.`);

      const json = await res.json();
      const items: AgroCultureItem[] = json.items || [];
      setCulturas(items);

      if (items.length === 0) {
        setSelectedCultura("");
        return;
      }

      if (!items.some((x) => x.cultura === selectedCultura)) {
        setSelectedCultura(items[0].cultura);
      }
    } finally {
      setLoadingCulturas(false);
    }
  }

  async function fetchSafras(uf: string, cultura: string) {
    setLoadingSafras(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/agro/producao/safras?uf=${encodeURIComponent(
          uf
        )}&cultura=${encodeURIComponent(cultura)}`
      );

      if (!res.ok) {
        throw new Error(`Erro ao carregar safras para ${uf} / ${cultura}.`);
      }

      const json = await res.json();
      const items: AgroSafraItem[] = json.items || [];
      setSafras(items);

      if (items.length === 0) {
        setSelectedSafra("");
        return;
      }

      if (!items.some((x) => x.safra === selectedSafra)) {
        setSelectedSafra(items[0].safra);
      }
    } finally {
      setLoadingSafras(false);
    }
  }

  async function fetchComparativo(uf: string, cultura: string, safra: string) {
    setLoadingComparativo(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/agro/producao/comparativo?uf=${encodeURIComponent(
          uf
        )}&cultura=${encodeURIComponent(cultura)}&safra=${encodeURIComponent(
          safra
        )}`
      );

      if (!res.ok) {
        throw new Error(
          `Erro ao carregar comparativo agrícola para ${uf} / ${cultura} / ${safra}.`
        );
      }

      const json: AgroComparativoResponse = await res.json();
      setComparativo(json);
    } finally {
      setLoadingComparativo(false);
    }
  }

  async function fetchHistorico(uf: string, cultura: string) {
    setLoadingHistorico(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/agro/producao/historico?uf=${encodeURIComponent(
          uf
        )}&cultura=${encodeURIComponent(cultura)}&limit=10`
      );

      if (!res.ok) {
        throw new Error(`Erro ao carregar histórico para ${uf} / ${cultura}.`);
      }

      const json: AgroHistoricoResponse = await res.json();
      setHistorico(json.items || []);
    } finally {
      setLoadingHistorico(false);
    }
  }

  async function fetchRadarSidePanel() {
    setLoadingRadar(true);
    try {
      const [editorialRes, emergentesRes, estatisticoRes, ioaRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/agro/radar/editorial`),
          fetch(`${API_BASE_URL}/agro/radar/emergentes`),
          fetch(`${API_BASE_URL}/agro/radar/estatistico?limit=12`),
          fetch(`${API_BASE_URL}/agro/radar/ioa?limit=8`),
        ]);

      const editorialJson: EditorialRadarResponse = editorialRes.ok
        ? await editorialRes.json()
        : { items: [] };

      const emergentesJson: EmergingRadarResponse = emergentesRes.ok
        ? await emergentesRes.json()
        : { watchlist: [], discovered: [] };

      const estatisticoJson: StatisticalRadarResponse = estatisticoRes.ok
        ? await estatisticoRes.json()
        : { emergentes: [], expansao_relevante: [], pressao: [] };

      const ioaJson: IoaResponse = ioaRes.ok
        ? await ioaRes.json()
        : { items: [] };

      setEditorialRadar(editorialJson || { items: [] });
      setEmergingRadar(emergentesJson);
      setStatisticalRadar(estatisticoJson);
      setIoaRadar(ioaJson);
    } finally {
      setLoadingRadar(false);
    }
  }

  async function fetchAgroSentiment(uf: string, cultura: string) {
    setLoadingAgroSentiment(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/agro/sentimento?uf=${encodeURIComponent(
          uf
        )}&cultura=${encodeURIComponent(cultura)}`
      );

      if (!res.ok) {
        throw new Error(`Erro ao carregar sentimento para ${uf} / ${cultura}.`);
      }

      const json: AgroSentimentResponse = await res.json();
      setAgroSentiment(json);
    } catch (error) {
      console.error(error);
      setAgroSentiment(null);
    } finally {
      setLoadingAgroSentiment(false);
    }
  }

  useEffect(() => {
    fetchUfs().catch((err) => {
      console.error(err);
      setErrorMsg("Não foi possível carregar os estados.");
    });

    fetchRadarSidePanel().catch((err) => {
      console.error(err);
    });
  }, []);

  useEffect(() => {
    if (!selectedUf) {
      setCulturas([]);
      setSelectedCultura("");
      setSafras([]);
      setSelectedSafra("");
      setComparativo(null);
      setHistorico([]);
      setAgroSentiment(null);
      return;
    }

    setErrorMsg(null);
    setCulturas([]);
    setSelectedCultura("");
    setSafras([]);
    setSelectedSafra("");
    setComparativo(null);
    setHistorico([]);
    setAgroSentiment(null);

    fetchCulturas(selectedUf).catch((err) => {
      console.error(err);
      setErrorMsg("Não foi possível carregar as culturas.");
    });
  }, [selectedUf]);

  useEffect(() => {
    if (!selectedUf || !selectedCultura) {
      setSafras([]);
      setSelectedSafra("");
      setComparativo(null);
      setHistorico([]);
      setAgroSentiment(null);
      return;
    }

    setErrorMsg(null);
    setSafras([]);
    setSelectedSafra("");
    setComparativo(null);
    setHistorico([]);
    setAgroSentiment(null);

    fetchSafras(selectedUf, selectedCultura).catch((err) => {
      console.error(err);
      setErrorMsg("Não foi possível carregar as safras.");
    });

    fetchHistorico(selectedUf, selectedCultura).catch((err) => {
      console.error(err);
      setHistorico([]);
    });

    fetchAgroSentiment(selectedUf, selectedCultura).catch((err) => {
      console.error(err);
      setAgroSentiment(null);
    });
  }, [selectedUf, selectedCultura]);

  useEffect(() => {
    if (!selectedUf || !selectedCultura || !selectedSafra) {
      setComparativo(null);
      return;
    }

    setErrorMsg(null);

    fetchComparativo(selectedUf, selectedCultura, selectedSafra).catch((err) => {
      console.error(err);
      setComparativo(null);
      setErrorMsg("Não foi possível carregar a tabela comparativa.");
    });
  }, [selectedUf, selectedCultura, selectedSafra]);

  const header = comparativo?.header;

  const selectedUfItem = useMemo(
    () => ufs.find((x) => x.uf === selectedUf) || null,
    [ufs, selectedUf]
  );

  const chartData: ChartPoint[] = useMemo(() => {
    const grouped = new Map<string, ChartPoint>();

    for (const item of historico) {
      const current = grouped.get(item.safra) || {
        safra: item.safra,
        ibge: null,
        conab: null,
      };

      const value = getMetricValue(item, chartMetric);

      if (item.fonte?.toUpperCase() === "IBGE") {
        current.ibge = value;
      } else if (item.fonte?.toUpperCase() === "CONAB") {
        current.conab = value;
      }

      grouped.set(item.safra, current);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => safraSortKey(a.safra) - safraSortKey(b.safra)
    );
  }, [historico, chartMetric]);

  const metricLabel = useMemo(() => {
    if (chartMetric === "area_plantada") return "Área Plantada";
    if (chartMetric === "produtividade") return "Produtividade";
    return "Produção";
  }, [chartMetric]);

  const radarEditorialHighlights = useMemo(() => {
    return (editorialRadar?.items || []).slice(0, 3);
  }, [editorialRadar]);

  const radarIoaHighlights = useMemo(() => {
    return (ioaRadar?.items || []).slice(0, 5);
  }, [ioaRadar]);

  const radarStatEmergentes = useMemo(() => {
    return (statisticalRadar?.emergentes || []).slice(0, 4);
  }, [statisticalRadar]);

  const radarStatPressao = useMemo(() => {
    return (statisticalRadar?.pressao || []).slice(0, 4);
  }, [statisticalRadar]);

  const topOpportunity = useMemo(() => radarIoaHighlights[0] || null, [radarIoaHighlights]);
  const topPressure = useMemo(() => radarStatPressao[0] || null, [radarStatPressao]);
  const topNews = useMemo(() => radarEditorialHighlights[0] || null, [radarEditorialHighlights]);

  const isBusy =
    loadingUfs ||
    loadingCulturas ||
    loadingSafras ||
    loadingComparativo;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300/80">
              Aba Produção Agrícola
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-100">
              Comparativo IBGE × CONAB
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Selecione o estado, a cultura e a safra para comparar séries
              agrícolas disponíveis por fonte.
            </p>
          </div>

          <div className="grid w-full gap-3 md:grid-cols-3 xl:max-w-4xl">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Estado
              </label>
              <select
                value={selectedUf}
                onChange={(e) => setSelectedUf(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-fuchsia-500"
              >
                <option value="">Selecione</option>
                {ufs.map((item) => (
                  <option key={item.uf} value={item.uf}>
                    {formatUfLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Cultura
              </label>
              <select
                value={selectedCultura}
                onChange={(e) => setSelectedCultura(e.target.value)}
                disabled={!selectedUf || culturas.length === 0}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {loadingCulturas
                    ? "Carregando..."
                    : culturas.length === 0
                    ? "Sem culturas disponíveis"
                    : "Selecione"}
                </option>
                {culturas.map((item) => (
                  <option key={item.cultura} value={item.cultura}>
                    {item.label || formatCropLabel(item.cultura)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Safra
              </label>
              <select
                value={selectedSafra}
                onChange={(e) => setSelectedSafra(e.target.value)}
                disabled={!selectedCultura || safras.length === 0}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {loadingSafras
                    ? "Carregando..."
                    : safras.length === 0
                    ? "Sem safras disponíveis"
                    : "Selecione"}
                </option>
                {safras.map((item) => (
                  <option key={item.safra} value={item.safra}>
                    {item.label || item.safra}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {isBusy && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300 shadow-sm backdrop-blur">
          Carregando comparativo de produção agrícola...
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-100">
                Tabela Comparativa
              </h2>
              <p className="text-sm text-slate-400">
                Séries disponíveis por fonte para a safra selecionada.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Estado
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {formatUfLabel(selectedUfItem)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Cultura
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {header?.cultura
                    ? formatCropLabel(header.cultura)
                    : formatCropLabel(selectedCultura)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Safra
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {header?.safra || selectedSafra || "-"}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="py-2 pr-4">Fonte</th>
                    <th className="py-2 pr-4">Série</th>
                    <th className="py-2 pr-4">Área Plantada</th>
                    <th className="py-2 pr-4">Produção</th>
                    <th className="py-2 pr-4">Produtividade</th>
                    <th className="py-2 pr-4">Projeção</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativo?.rows?.length ? (
                    comparativo.rows.map((row, idx) => (
                      <tr
                        key={`${row.fonte}-${row.serie}-${idx}`}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-slate-100">
                          {row.fonte}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {row.cultura_label || formatSerieLabel(row.serie)}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {formatInteger(row.area_plantada)}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {formatInteger(row.producao)}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {formatNumber(row.produtividade)}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {formatInteger(row.projecao)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-4 text-center text-sm text-slate-400"
                      >
                        Nenhum dado disponível para a seleção atual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Histórico da cultura
                </h3>
                <p className="text-sm text-slate-400">
                  Série agregada por fonte para a cultura selecionada.
                </p>
              </div>

              <div className="flex w-full max-w-xs flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">
                  Métrica do gráfico
                </label>
                <select
                  value={chartMetric}
                  onChange={(e) => setChartMetric(e.target.value as ChartMetric)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-fuchsia-500"
                >
                  <option value="producao">Produção</option>
                  <option value="area_plantada">Área Plantada</option>
                  <option value="produtividade">Produtividade</option>
                </select>
              </div>
            </div>

            {loadingHistorico ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
                Carregando histórico...
              </div>
            ) : chartData.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
                Sem histórico disponível para o gráfico.
              </div>
            ) : (
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="safra"
                      tick={{ fontSize: 11, fill: "#cbd5e1" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#cbd5e1" }}
                      tickFormatter={(value) =>
                        chartMetric === "produtividade"
                          ? formatNumber(Number(value), 2)
                          : formatInteger(Number(value))
                      }
                    />
                    <Tooltip
                      {...chartTooltipStyle()}
                      formatter={(value: number | string, name: string) => {
                        const label =
                          String(name).includes("IBGE")
                            ? "IBGE"
                            : String(name).includes("CONAB")
                            ? "CONAB"
                            : String(name);

                        return [
                          chartMetric === "produtividade"
                            ? formatNumber(Number(value), 2)
                            : formatInteger(Number(value)),
                          label,
                        ];
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ibge"
                      name={`IBGE - ${metricLabel}`}
                      stroke="#60a5fa"
                      strokeWidth={2.5}
                      dot
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="conab"
                      name={`CONAB - ${metricLabel}`}
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">
                  Sentimento Editorial da Cultura
                </h2>
                <p className="text-sm text-slate-400">
                  Leitura contextual de notícias para a cultura e estado selecionados.
                </p>
              </div>

              {loadingAgroSentiment ? (
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
                  Atualizando...
                </span>
              ) : agroSentiment ? (
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSentimentBadgeClass(
                      agroSentiment.sentiment_label
                    )}`}
                  >
                    {formatSentimentLabel(agroSentiment.sentiment_label)}
                  </span>

                  <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200">
                    Score: {formatNumber(agroSentiment.sentiment_score, 2)}
                  </span>

                  <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200">
                    Manchetes: {formatInteger(agroSentiment.headline_count)}
                  </span>
                </div>
              ) : null}
            </div>

            {loadingAgroSentiment ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
                Carregando leitura editorial da cultura...
              </div>
            ) : !selectedUf || !selectedCultura ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
                Selecione um estado e uma cultura para visualizar o sentimento editorial.
              </div>
            ) : !agroSentiment ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
                Não foi possível carregar o sentimento editorial para a seleção atual.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Estado
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {formatUfLabel(selectedUfItem)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Cultura
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {formatCropLabel(selectedCultura)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Escopo da leitura
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {agroSentiment.matched_scope === "uf"
                        ? "Cultura + UF"
                        : "Cultura (fallback)"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">
                    Tópicos no radar
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(agroSentiment.top_topics || []).length ? (
                      agroSentiment.top_topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-300"
                        >
                          {topic}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-300">
                        Sem tópicos identificados.
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Resumo editorial
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {agroSentiment.editorial_summary || "Sem resumo disponível."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Manchetes recentes
                    </p>

                    {agroSentiment.updated_at && (
                      <p className="text-xs text-slate-500">
                        Atualizado: {agroSentiment.updated_at}
                      </p>
                    )}
                  </div>

                  {(agroSentiment.latest_headlines || []).length === 0 ? (
                    <p className="text-sm text-slate-300">
                      Sem manchetes recentes para exibir.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {agroSentiment.latest_headlines.slice(0, 5).map((headline, idx) => (
                        <div
                          key={`${idx}-${headline.title || "headline"}`}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                        >
                          <p className="text-sm leading-6 text-slate-200">
                            {headline.title || "Sem título"}
                          </p>

                          {(headline.date || headline.source) && (
                            <p className="mt-2 text-xs text-slate-500">
                              {[headline.date, headline.source]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">
                  Índice de Oportunidade Agrícola
                </h2>
                <p className="text-sm text-slate-400">
                  Ranking sintético que combina força estatística, sinal editorial e perfil emergente.
                </p>
              </div>
              {loadingRadar && (
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
                  Atualizando...
                </span>
              )}
            </div>

            {radarIoaHighlights.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                Sem dados disponíveis no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {radarIoaHighlights.map((item, idx) => (
                  <div
                    key={`ioa-${item.cultura}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getRankBadge(
                              idx
                            )}`}
                          >
                            #{idx + 1}
                          </span>
                          <p className="truncate text-base font-semibold text-slate-100">
                            {item.label || formatCropLabel(item.cultura)}
                          </p>
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.categoria || "outras"} • {item.safra_atual || "-"}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-100">
                          {formatNumber(item.ioa, 1)}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getFaixaBadgeClass(
                            item.faixa
                          )}`}
                        >
                          {item.faixa?.replaceAll("_", " ") || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Intensidade do índice</span>
                        <span>{formatNumber(item.ioa, 1)}/100</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${getIoaBarClass(
                            item.ioa
                          )}`}
                          style={{ width: getIoaWidth(item.ioa) }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getBucketBadgeClass(
                          item.bucket
                        )}`}
                      >
                        {item.bucket?.replaceAll("_", " ") || "-"}
                      </span>

                      {item.crescimento_producao_percent !== null &&
                        item.crescimento_producao_percent !== undefined && (
                          <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300">
                            Δ produção {formatNumber(item.crescimento_producao_percent, 2)}%
                          </span>
                        )}
                    </div>

                    {item.interpretacao && (
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {item.interpretacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-100">
                Radar Editorial
              </h2>
              <p className="text-sm text-slate-400">
                Leitura de mercado, emergentes e pressões do agro.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getSummaryIconClass("opportunity")}`}>
                    Oportunidade
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {topOpportunity?.label || "Sem destaque"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {topOpportunity
                    ? `IOA ${formatNumber(topOpportunity.ioa, 1)} • ${topOpportunity.faixa?.replaceAll("_", " ")}`
                    : "Sem leitura disponível"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getSummaryIconClass("pressure")}`}>
                    Pressão
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {topPressure?.label || "Sem destaque"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {topPressure
                    ? `Δ produção ${formatNumber(topPressure.crescimento_producao_percent, 2)}%`
                    : "Sem leitura disponível"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getSummaryIconClass("news")}`}>
                    Notícias
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {topNews ? formatCropLabel(topNews.cultura) : "Sem destaque"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {topNews
                    ? `${topNews.mentions} menção${topNews.mentions === 1 ? "" : "ões"} recentes`
                    : "Sem leitura disponível"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notícias no radar
                </p>

                {radarEditorialHighlights.length === 0 ? (
                  <p className="text-sm text-slate-300">
                    Sem destaques editoriais recentes.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {radarEditorialHighlights.map((item) => {
                      const topNewsItem = item.recent_news?.[0];
                      return (
                        <div
                          key={`editorial-${item.cultura}`}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-100">
                              {formatCropLabel(item.cultura)}
                            </p>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300">
                              {item.mentions} menção{item.mentions === 1 ? "" : "ões"}
                            </span>
                          </div>

                          {topNewsItem?.title && (
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {topNewsItem.title}
                            </p>
                          )}

                          {(topNewsItem?.date || topNewsItem?.source) && (
                            <p className="mt-2 text-xs text-slate-500">
                              {[topNewsItem.date, topNewsItem.source]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Emergentes estatísticos
                </p>

                {radarStatEmergentes.length === 0 ? (
                  <p className="text-sm text-slate-300">
                    Sem culturas emergentes destacadas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {radarStatEmergentes.map((item) => (
                      <div
                        key={`stat-em-${item.cultura}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-100">
                            {item.label || formatCropLabel(item.cultura)}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getBucketBadgeClass(
                              item.bucket
                            )}`}
                          >
                            {item.bucket?.replaceAll("_", " ") || "-"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          Crescimento de produção:{" "}
                          <span className="font-semibold text-slate-100">
                            {formatNumber(item.crescimento_producao_percent, 2)}%
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pressões produtivas
                </p>

                {radarStatPressao.length === 0 ? (
                  <p className="text-sm text-slate-300">
                    Sem pressões relevantes destacadas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {radarStatPressao.map((item) => (
                      <div
                        key={`stat-pr-${item.cultura}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-100">
                            {item.label || formatCropLabel(item.cultura)}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getBucketBadgeClass(
                              item.bucket
                            )}`}
                          >
                            {item.bucket?.replaceAll("_", " ") || "-"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          Tendência:{" "}
                          <span className="font-semibold text-slate-100">
                            {item.tendencia?.replaceAll("_", " ") || "-"}
                          </span>
                          {" • "}
                          Δ produção{" "}
                          <span className="font-semibold text-slate-100">
                            {formatNumber(item.crescimento_producao_percent, 2)}%
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Watchlist de culturas
                </p>

                {(emergingRadar?.watchlist?.length || 0) === 0 &&
                (emergingRadar?.discovered?.length || 0) === 0 ? (
                  <p className="text-sm text-slate-300">
                    Sem sinais relevantes na watchlist no momento.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(emergingRadar?.watchlist || []).slice(0, 4).map((item, idx) => (
                      <div
                        key={`watch-${idx}-${item.crop_id || item.crop}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-100">
                            {item.crop || item.crop_id || "-"}
                          </p>
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300">
                            {formatInteger(item.mentions || 0)} sinal
                            {(item.mentions || 0) === 1 ? "" : "s"}
                          </span>
                        </div>
                        {item.categoria && (
                          <p className="mt-2 text-xs text-slate-400">
                            Categoria: {item.categoria}
                          </p>
                        )}
                      </div>
                    ))}

                    {(emergingRadar?.discovered || []).slice(0, 3).map((item, idx) => (
                      <div
                        key={`disc-${idx}-${item.crop}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-100">
                            {item.crop || "-"}
                          </p>
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300">
                            descoberta • {formatInteger(item.mentions || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}