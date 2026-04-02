"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base";
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

const API_BASE_URL = getApiBaseUrl();

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
      backgroundColor: "#ffffff",
      border: "1px solid #d6d3d1",
      color: "#1c1917",
      borderRadius: "14px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    },
    labelStyle: { color: "#1c1917", fontWeight: "bold" },
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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "expansao_relevante":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "pressao":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-brand-stone-300 bg-brand-bg/50 text-brand-stone-600";
  }
}

function getFaixaBadgeClass(faixa?: string | null): string {
  switch ((faixa || "").toLowerCase()) {
    case "muito_alta":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "alta":
      return "border-lime-200 bg-lime-50 text-lime-700";
    case "moderada":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "neutra":
      return "border-brand-stone-300 bg-brand-bg/50 text-brand-stone-600";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getIoaBarClass(ioa?: number | null): string {
  const value = Number(ioa ?? 0);

  if (value >= 80) return "bg-emerald-400";
  if (value >= 65) return "bg-lime-400";
  if (value >= 50) return "bg-amber-400";
  if (value >= 35) return "bg-brand-stone-400";
  if (value >= 20) return "bg-brand-stone-200";
  return "bg-rose-400";
}

function getIoaWidth(ioa?: number | null): string {
  const value = Math.max(0, Math.min(100, Number(ioa ?? 0)));
  return `${value}%`;
}

function getRankBadge(index: number): string {
  if (index === 0) return "bg-amber-100 text-amber-700 border-amber-200";
  if (index === 1) return "bg-brand-stone-100 text-brand-stone-600 border-brand-stone-200";
  if (index === 2) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-brand-bg text-brand-stone-600 border-brand-stone-300";
}

function getSummaryIconClass(kind: "opportunity" | "pressure" | "news"): string {
  if (kind === "opportunity") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (kind === "pressure") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getSentimentBadgeClass(label?: string | null): string {
  switch ((label || "").toLowerCase()) {
    case "positivo":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "negativo":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
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

function getBagWeight(crop?: string | null): number | null {
  if (!crop) return null;
  const c = crop.toLowerCase();
  if (c.includes("soja") || c.includes("milho") || c.includes("trigo") || c.includes("cafe") || c.includes("feijao")) {
    return 60;
  }
  if (c.includes("arroz")) {
    return 50;
  }
  return null;
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

  const summaryMetrics = useMemo(() => {
    if (!comparativo?.rows?.length) return null;
    const conab = comparativo.rows.find(r => r.fonte.toUpperCase() === 'CONAB');
    const ibge = comparativo.rows.find(r => r.fonte.toUpperCase() === 'IBGE');
    
    const producao = conab?.producao || ibge?.producao || 0;
    const area = conab?.area_plantada || ibge?.area_plantada || 0;
    const produtividade = conab?.produtividade || ibge?.produtividade || 0;
    const bagWeight = getBagWeight(selectedCultura);
    
    return {
      producao,
      area,
      produtividade,
      produtividadeSacas: bagWeight ? produtividade / bagWeight : null,
      bagWeight,
      fonte: conab ? 'CONAB' : (ibge ? 'IBGE' : '-')
    };
  }, [comparativo, selectedCultura]);

  return (
    <div className="space-y-0">
      {/* Selectors & Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-4 p-8 border-r border-brand-stone-300 bg-brand-bg/50">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Estado</label>
              <select
                value={selectedUf}
                onChange={(e) => setSelectedUf(e.target.value)}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2.5 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue"
              >
                <option value="">Selecione</option>
                {ufs.map((item) => (
                  <option key={item.uf} value={item.uf}>{formatUfLabel(item)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Cultura</label>
              <select
                value={selectedCultura}
                onChange={(e) => setSelectedCultura(e.target.value)}
                disabled={!selectedUf || culturas.length === 0}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2.5 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue disabled:opacity-50"
              >
                <option value="">{loadingCulturas ? "Carregando..." : "Selecione"}</option>
                {culturas.map((item) => (
                  <option key={item.cultura} value={item.cultura}>{item.label || formatCropLabel(item.cultura)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Safra</label>
              <select
                value={selectedSafra}
                onChange={(e) => setSelectedSafra(e.target.value)}
                disabled={!selectedCultura || safras.length === 0}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2.5 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue disabled:opacity-50"
              >
                <option value="">{loadingSafras ? "Carregando..." : "Selecione"}</option>
                {safras.map((item) => (
                  <option key={item.safra} value={item.safra}>{item.label || item.safra}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-8 grid grid-cols-1 sm:grid-cols-3">
          <div className="p-8 border-r border-brand-stone-300 flex flex-col justify-center group hover:bg-white transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Produção Total</span>
            <span className="text-3xl font-bold tracking-tighter text-brand-dark">
              {summaryMetrics ? `${formatInteger(summaryMetrics.producao)} t` : "—"}
            </span>
            <span className="text-[9px] text-brand-stone-400 block mt-2">Fonte: {summaryMetrics?.fonte || "—"}</span>
          </div>
          <div className="p-8 border-r border-brand-stone-300 flex flex-col justify-center group hover:bg-white transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Área Plantada</span>
            <span className="text-3xl font-bold tracking-tighter text-brand-dark">
              {summaryMetrics ? `${formatInteger(summaryMetrics.area)} ha` : "—"}
            </span>
            <span className="text-[9px] text-brand-stone-400 block mt-2">Extensão territorial</span>
          </div>
          <div className="p-8 flex flex-col justify-center group hover:bg-white transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Produtividade</span>
            <div className="flex flex-col">
              <span className="text-3xl font-bold tracking-tighter text-brand-blue">
                {summaryMetrics ? `${formatInteger(summaryMetrics.produtividade)} kg/ha` : "—"}
              </span>
              {summaryMetrics?.produtividadeSacas && (
                <span className="text-sm font-bold text-emerald-600 mt-1">
                  {formatNumber(summaryMetrics.produtividadeSacas, 1)} sc/ha <span className="text-[10px] font-normal text-brand-stone-400">(saca {summaryMetrics.bagWeight}kg)</span>
                </span>
              )}
            </div>
            <span className="text-[9px] text-brand-stone-400 block mt-2">Rendimento médio</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mx-8 mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-8 border-r border-brand-stone-300 p-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-1 block">Evolução Histórica</span>
              <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">{metricLabel} por Safra</h3>
            </div>
            <div className="flex gap-2">
              {(["producao", "area_plantada", "produtividade"] as ChartMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMetric(m)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${chartMetric === m ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-brand-stone-600 border-brand-stone-300 hover:border-brand-blue'}`}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="safra" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={{ stroke: '#d6d3d1' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v, 0)} />
                <Tooltip contentStyle={chartTooltipStyle().contentStyle} />
                <Legend iconType="circle" verticalAlign="top" align="right" height={36}/>
                <Line type="monotone" dataKey="ibge" name="IBGE" stroke="#0071B9" strokeWidth={3} dot={{ r: 4, fill: "#0071B9", strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="conab" name="CONAB" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: "#F59E0B", strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 bg-brand-bg/10 p-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-6">Radar de Oportunidades (IOA)</span>
          <div className="space-y-4">
            {radarIoaHighlights.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-brand-stone-300 bg-white shadow-sm group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getRankBadge(idx)}`}>#{idx + 1}</span>
                  <span className="text-xl font-bold text-brand-dark">{formatNumber(item.ioa, 1)}</span>
                </div>
                <p className="font-bold text-brand-dark mb-1">{item.label || formatCropLabel(item.cultura)}</p>
                <div className="h-1 w-full bg-brand-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full ${getIoaBarClass(item.ioa)}`} style={{ width: getIoaWidth(item.ioa) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-4 p-8 border-r border-brand-stone-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-4">Comparativo IBGE × CONAB</span>
          <div className="bg-white rounded-2xl border border-brand-stone-300 shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-brand-stone-300 text-left text-brand-stone-600 bg-brand-bg/50">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px]">Fonte</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px] text-right">Produção</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px] text-right">Área</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-stone-200">
                {comparativo?.rows?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-brand-bg/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-brand-dark text-xs">{row.fonte}</td>
                    <td className="py-3 px-4 text-right text-brand-stone-600 font-bold text-xs">{formatInteger(row.producao)} t</td>
                    <td className="py-3 px-4 text-right text-brand-stone-600 text-xs">{formatInteger(row.area_plantada)} ha</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-3">Watchlist</span>
            <div className="flex flex-wrap gap-2">
              {emergingRadar?.watchlist?.map((item, idx) => (
                <span key={idx} className="px-2 py-1 rounded-md bg-white border border-brand-stone-300 text-[9px] font-medium text-brand-stone-600">
                  {item.crop || item.crop_id}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 p-8 border-r border-brand-stone-300 bg-brand-bg/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-6">Emergentes & Pressões</span>
          <div className="space-y-6">
            <div>
              <span className="text-[9px] font-bold uppercase text-brand-blue block mb-3">Culturas Emergentes</span>
              <div className="space-y-2">
                {radarStatEmergentes.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-brand-stone-200 shadow-sm">
                    <span className="text-xs font-bold text-brand-dark">{item.label || formatCropLabel(item.cultura)}</span>
                    <span className="text-[10px] font-bold text-emerald-600">+{formatNumber(item.crescimento_producao_percent, 1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-rose-600 block mb-3">Pressões Produtivas</span>
              <div className="space-y-2">
                {radarStatPressao.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-brand-stone-200 shadow-sm">
                    <span className="text-xs font-bold text-brand-dark">{item.label || formatCropLabel(item.cultura)}</span>
                    <span className="text-[10px] font-bold text-rose-600">{formatNumber(item.crescimento_producao_percent, 1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 p-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-6">Sentimento & Manchetes</span>
          {agroSentiment ? (
            <div className="space-y-6">
              <div className={`p-5 rounded-2xl border ${getSentimentBadgeClass(agroSentiment.sentiment_label)} bg-white shadow-sm`}>
                <span className="text-[9px] font-bold uppercase text-brand-stone-600 block mb-1">Resumo Editorial</span>
                <span className="text-lg font-bold block mb-2">{formatSentimentLabel(agroSentiment.sentiment_label)}</span>
                <p className="text-xs leading-relaxed text-brand-stone-600">{agroSentiment.editorial_summary}</p>
              </div>
              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase text-brand-stone-400 block">Manchetes Recentes</span>
                {agroSentiment.latest_headlines.slice(0, 3).map((h, i) => (
                  <div key={i} className="p-3 rounded-lg border border-brand-stone-200 bg-white/50 text-[10px] text-brand-stone-600 leading-snug">
                    {h.title}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-brand-stone-400 italic">Selecione os filtros para carregar o sentimento.</p>
          )}
        </div>
      </div>
    </div>
  );
}