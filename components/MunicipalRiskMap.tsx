"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap, LatLngBoundsExpression } from "leaflet";
import { getApiBaseUrl } from "@/lib/api-base";

const MapContainer = dynamic(
  async () => (await import("react-leaflet")).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(
  async () => (await import("react-leaflet")).TileLayer,
  { ssr: false }
);
const GeoJSON = dynamic(
  async () => (await import("react-leaflet")).GeoJSON,
  { ssr: false }
);

const API_BASE_URL = getApiBaseUrl();

type UfItem = {
  abbr_uf: string;
  name_uf: string;
};

type UfsResponse = {
  ufs: UfItem[];
};

type MunicipalItem = {
  code_muni: string;
  code_muni_6?: string | null;
  name_muni: string;
  abbr_uf: string;
  code_uf?: string | null;
  name_uf?: string | null;
  iis_window: number;
  iis_value: number | null;
  iis_1m?: number | null;
  iis_3m?: number | null;
  iis_6m?: number | null;
  ref_date?: string | null;
};

type MunicipalTableResponse = {
  window: number;
  uf: string | null;
  count: number;
  items: MunicipalItem[];
};

type FeatureProps = {
  code_muni?: string;
  name_muni?: string;
  abbr_uf?: string;
  name_uf?: string;
  iis_window?: number;
  iis_value?: number | null;
  ref_date?: string | null;
  [key: string]: unknown;
};

type GeoJsonGeometry = {
  type: string;
  coordinates: any;
};

type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: FeatureProps;
};

type GeoJsonResponse = {
  type: "FeatureCollection";
  window: number;
  uf: string | null;
  count: number;
  features: GeoJsonFeature[];
};

type WindowOption = 1 | 3 | 6;

type MunicipalRiskMapProps = {
  selectedUf?: string;
  onSelectedUfChange?: (uf: string) => void;
  selectedMunicipio?: string;
  onSelectedMunicipioChange?: (codeMuni: string) => void;
  selectedWindow?: WindowOption;
  onSelectedWindowChange?: (window: WindowOption) => void;
  onMunicipioSnapshotChange?: (item: MunicipalItem | null) => void;
  showSelectors?: boolean;
};

function formatNumber(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getFillColor(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "#78716c";
  if (value <= 1) return "#7f1d1d";
  if (value <= 2) return "#b91c1c";
  if (value <= 3) return "#ea580c";
  if (value <= 4) return "#facc15";
  if (value <= 5) return "#84cc16";
  return "#166534";
}

function getIisLabel(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Sem dado";
  if (value <= 1) return "Seca Excepcional";
  if (value <= 2) return "Seca Extrema";
  if (value <= 3) return "Seca Severa";
  if (value <= 4) return "Seca Moderada";
  if (value <= 5) return "Seca Fraca";
  return "Normal";
}

function extractLatLngsFromCoordinates(coords: any): [number, number][] {
  const points: [number, number][] = [];

  function walk(node: any) {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === "number" &&
      typeof node[1] === "number"
    ) {
      const lng = node[0];
      const lat = node[1];
      points.push([lat, lng]);
      return;
    }
    for (const child of node) walk(child);
  }

  walk(coords);
  return points;
}

function computeBoundsFromFeatures(
  features: GeoJsonFeature[]
): LatLngBoundsExpression | null {
  const points: [number, number][] = [];
  for (const feature of features) {
    if (!feature.geometry?.coordinates) continue;
    points.push(...extractLatLngsFromCoordinates(feature.geometry.coordinates));
  }
  if (!points.length) return null;
  return points as LatLngBoundsExpression;
}

export default function MunicipalRiskMap({
  selectedUf,
  onSelectedUfChange,
  selectedMunicipio,
  onSelectedMunicipioChange,
  selectedWindow,
  onSelectedWindowChange,
  onMunicipioSnapshotChange,
  showSelectors = true,
}: MunicipalRiskMapProps) {
  const [ufs, setUfs] = useState<UfItem[]>([]);
  const [internalUf, setInternalUf] = useState<string>("");
  const [internalMunicipio, setInternalMunicipio] = useState<string>("");
  const [internalWindow, setInternalWindow] = useState<WindowOption>(3);

  const [mapData, setMapData] = useState<GeoJsonResponse | null>(null);
  const [tableData, setTableData] = useState<MunicipalTableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  const ufValue = selectedUf ?? internalUf;
  const municipioValue = selectedMunicipio ?? internalMunicipio;
  const windowValue = selectedWindow ?? internalWindow;

  function setUfValue(value: string) {
    onSelectedUfChange ? onSelectedUfChange(value) : setInternalUf(value);
  }

  function setMunicipioValue(value: string) {
    onSelectedMunicipioChange
      ? onSelectedMunicipioChange(value)
      : setInternalMunicipio(value);
  }

  function setWindowValue(value: WindowOption) {
    onSelectedWindowChange
      ? onSelectedWindowChange(value)
      : setInternalWindow(value);
  }

  async function fetchUfs() {
    const res = await fetch(`${API_BASE_URL}/monitoramento-risco-agro/ufs`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Erro ao carregar UFs.");
    const data: UfsResponse = await res.json();
    const loadedUfs = data.ufs || [];
    setUfs(loadedUfs);
    if (!ufValue && loadedUfs.length > 0) setUfValue(loadedUfs[0].abbr_uf);
  }

  async function fetchMapAndTable(uf: string, window: WindowOption) {
    setLoading(true);
    setError(null);

    try {
      const [mapRes, tableRes] = await Promise.all([
        fetch(`${API_BASE_URL}/monitoramento-risco-agro/mapa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uf, window }),
        }),
        fetch(`${API_BASE_URL}/monitoramento-risco-agro/municipios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uf, window, limit: 500 }),
        }),
      ]);

      if (!mapRes.ok) throw new Error("Erro ao carregar GeoJSON do mapa.");
      if (!tableRes.ok) throw new Error("Erro ao carregar tabela municipal.");

      const mapJson: GeoJsonResponse = await mapRes.json();
      const tableJson: MunicipalTableResponse = await tableRes.json();

      setMapData(mapJson);
      setTableData(tableJson);

      const stillExists = municipioValue
        ? tableJson.items.some((item) => item.code_muni === municipioValue)
        : false;

      if (!stillExists) {
        setMunicipioValue("");
        onMunicipioSnapshotChange?.(null);
      }
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os dados do mapa agroclimático.");
      setMapData(null);
      setTableData(null);
      setMunicipioValue("");
      onMunicipioSnapshotChange?.(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUfs().catch((err) => {
      console.error(err);
      setError("Não foi possível carregar a lista de estados.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ufValue) return;
    fetchMapAndTable(ufValue, windowValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ufValue, windowValue]);

  const selectedUfLabel = useMemo(() => {
    const found = ufs.find((u) => u.abbr_uf === ufValue);
    return found ? `${found.abbr_uf} - ${found.name_uf}` : ufValue || "-";
  }, [ufs, ufValue]);

  const municipiosOptions = useMemo(() => {
    const items = tableData?.items || [];
    return [...items].sort((a, b) => a.name_muni.localeCompare(b.name_muni, "pt-BR"));
  }, [tableData]);

  const filteredFeatures = useMemo(() => {
    const features = mapData?.features || [];
    if (!municipioValue) return features;
    return features.filter((feature) => feature.properties?.code_muni === municipioValue);
  }, [mapData, municipioValue]);

  const geoJsonObject = useMemo(
    () => ({ type: "FeatureCollection" as const, features: filteredFeatures }),
    [filteredFeatures]
  );

  const focusBounds = useMemo(
    () => computeBoundsFromFeatures(filteredFeatures),
    [filteredFeatures]
  );

  const topMunicipios = useMemo(() => {
    const items = tableData?.items || [];
    return items
      .filter((item) => item.iis_value !== null && item.iis_value !== undefined)
      .filter((item) => {
        const v = Number(item.iis_value);
        return !Number.isNaN(v) && v >= 1 && v <= 3;
      })
      .sort((a, b) => {
        const diff = Number(a.iis_value) - Number(b.iis_value);
        if (diff !== 0) return diff;
        return a.name_muni.localeCompare(b.name_muni, "pt-BR");
      });
  }, [tableData]);

  const selectedMunicipioItem = useMemo(() => {
    if (!municipioValue || !tableData?.items) return null;
    return tableData.items.find((item) => item.code_muni === municipioValue) || null;
  }, [municipioValue, tableData]);

  useEffect(() => {
    onMunicipioSnapshotChange?.(selectedMunicipioItem);
  }, [selectedMunicipioItem, onMunicipioSnapshotChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusBounds) return;
    try {
      map.fitBounds(focusBounds, {
        padding: [20, 20],
        maxZoom: municipioValue ? 10 : 7,
      });
    } catch (err) {
      console.error("Erro ao ajustar bounds do mapa:", err);
    }
  }, [focusBounds, municipioValue]);

  return (
    <div className="space-y-0">
      {showSelectors && (
        <div className="p-8 border-b border-brand-stone-300 bg-brand-bg/50">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 max-w-5xl">
            <div className="lg:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-2">Seleção Territorial</span>
              <h2 className="text-2xl font-bold tracking-tighter text-brand-dark">Filtros do Mapa</h2>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Estado</label>
              <select
                value={ufValue}
                onChange={(e) => {
                  setUfValue(e.target.value);
                  setMunicipioValue("");
                }}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue"
              >
                <option value="" disabled>Selecione...</option>
                {ufs.map((uf) => (
                  <option key={uf.abbr_uf} value={uf.abbr_uf}>{uf.abbr_uf} - {uf.name_uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Município</label>
              <select
                value={municipioValue}
                onChange={(e) => setMunicipioValue(e.target.value)}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue"
              >
                <option value="">Todos os municípios</option>
                {municipiosOptions.map((item) => (
                  <option key={item.code_muni} value={item.code_muni}>{item.name_muni}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-brand-stone-600">Janela IIS</label>
              <select
                value={windowValue}
                onChange={(e) => setWindowValue(Number(e.target.value) as WindowOption)}
                className="w-full rounded-lg border border-brand-stone-300 bg-white px-4 py-2 text-sm text-brand-dark shadow-sm outline-none focus:border-brand-blue"
              >
                <option value={1}>1 mês</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
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

      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-brand-stone-300">
        <div className="col-span-1 md:col-span-8 border-r border-brand-stone-300 p-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 mb-1 block">Visualização Espacial</span>
              <h3 className="text-2xl font-bold tracking-tighter text-brand-dark">Monitoramento IIS</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-brand-bg border border-brand-stone-300 text-[10px] font-bold uppercase text-brand-stone-600">
              {selectedUfLabel} {selectedMunicipioItem ? `• ${selectedMunicipioItem.name_muni}` : ""}
            </div>
          </div>
          <div className="h-[500px] rounded-2xl border border-brand-stone-300 overflow-hidden shadow-inner bg-brand-bg/50">
            <MapContainer
              center={[-14.235, -51.9253]}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
              ref={(mapInstance) => { if (mapInstance) mapRef.current = mapInstance; }}
            >
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {geoJsonObject && (
                <GeoJSON
                  key={`${ufValue}-${municipioValue}-${windowValue}-${filteredFeatures.length}`}
                  data={geoJsonObject as never}
                  style={(feature: any) => {
                    const value = feature?.properties?.iis_value;
                    return {
                      fillColor: getFillColor(value),
                      weight: municipioValue ? 2 : 0.5,
                      opacity: 1,
                      color: "#ffffff",
                      fillOpacity: 0.8,
                    };
                  }}
                  onEachFeature={(feature: any, layer: any) => {
                    const props = feature?.properties || {};
                    const value = props?.iis_value;
                    layer.bindTooltip(`
                      <div style="padding: 8px;">
                        <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">${props?.name_muni}</div>
                        <div style="font-size: 11px; color: #666;">IIS: ${formatNumber(value, 1)}</div>
                        <div style="font-size: 11px; font-weight: 700; color: ${getFillColor(value)};">${getIisLabel(value)}</div>
                      </div>
                    `);
                    layer.on({ click: () => setMunicipioValue(String(props?.code_muni ?? "")) });
                  }}
                />
              )}
            </MapContainer>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              ["#7f1d1d", "Excepcional"],
              ["#b91c1c", "Extrema"],
              ["#ea580c", "Severa"],
              ["#facc15", "Moderada"],
              ["#84cc16", "Fraca"],
              ["#166534", "Normal"],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold uppercase text-brand-stone-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 bg-brand-bg/10">
          <div className="p-8 border-b border-brand-stone-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-4">Resumo Territorial</span>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-brand-stone-300 bg-white shadow-sm">
                <span className="text-[9px] font-bold uppercase text-brand-stone-400 block mb-1">Municípios</span>
                <span className="text-2xl font-bold text-brand-dark">{tableData?.count ?? 0}</span>
              </div>
              <div className="p-4 rounded-xl border border-brand-stone-300 bg-white shadow-sm">
                <span className="text-[9px] font-bold uppercase text-brand-stone-400 block mb-1">Janela</span>
                <span className="text-2xl font-bold text-brand-dark">{windowValue}m</span>
              </div>
              {selectedMunicipioItem && (
                <div className="p-4 rounded-xl border border-brand-stone-300 bg-white shadow-sm">
                  <span className="text-[9px] font-bold uppercase text-brand-stone-400 block mb-1">IIS Selecionado</span>
                  <span className="text-2xl font-bold text-brand-dark">{formatNumber(selectedMunicipioItem.iis_value, 1)}</span>
                  <span className="text-[10px] font-bold uppercase text-brand-stone-400 block mt-1">{getIisLabel(selectedMunicipioItem.iis_value)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-stone-600 block mb-4">Críticos no Radar</span>
            <div className="space-y-2">
              {topMunicipios.slice(0, 6).map((item) => (
                <button
                  key={item.code_muni}
                  onClick={() => setMunicipioValue(item.code_muni)}
                  className="w-full p-3 rounded-lg border border-brand-stone-300 bg-white/50 text-left hover:bg-white transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-brand-dark truncate pr-2">{item.name_muni}</span>
                    <span className="text-xs font-bold" style={{ color: getFillColor(item.iis_value) }}>{formatNumber(item.iis_value, 1)}</span>
                  </div>
                </button>
              ))}
              {topMunicipios.length === 0 && <p className="text-xs text-brand-stone-400 italic">Nenhum município em alerta.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}