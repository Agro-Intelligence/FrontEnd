"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap, LatLngBoundsExpression } from "leaflet";

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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

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

function formatNumber(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Classes oficiais do IIS:
 * 1 - Seca Excepcional
 * 2 - Seca Extrema
 * 3 - Seca Severa
 * 4 - Seca Moderada
 * 5 - Seca Fraca
 * 6 - Normal
 */
function getFillColor(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "#334155";
  }

  if (value <= 1) return "#7f1d1d";
  if (value <= 2) return "#b91c1c";
  if (value <= 3) return "#ea580c";
  if (value <= 4) return "#facc15";
  if (value <= 5) return "#84cc16";
  return "#166534";
}

function getIisLabel(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Sem dado";
  }

  if (value <= 1) return "Seca Excepcional";
  if (value <= 2) return "Seca Extrema";
  if (value <= 3) return "Seca Severa";
  if (value <= 4) return "Seca Moderada";
  if (value <= 5) return "Seca Fraca";
  return "Normal";
}

/**
 * Extrai todos os pares [lat, lng] de uma geometria GeoJSON.
 * Leaflet usa [lat, lng], enquanto GeoJSON usa [lng, lat].
 */
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

    for (const child of node) {
      walk(child);
    }
  }

  walk(coords);
  return points;
}

function computeBoundsFromFeatures(
  features: GeoJsonFeature[]
): LatLngBoundsExpression | null {
  const points: [number, number][] = [];

  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry?.coordinates) continue;

    const geometryPoints = extractLatLngsFromCoordinates(geometry.coordinates);
    points.push(...geometryPoints);
  }

  if (!points.length) return null;
  return points as LatLngBoundsExpression;
}

export default function MunicipalRiskMap() {
  const [ufs, setUfs] = useState<UfItem[]>([]);
  const [selectedUf, setSelectedUf] = useState<string>("");
  const [selectedWindow, setSelectedWindow] = useState<WindowOption>(3);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>("");

  const [mapData, setMapData] = useState<GeoJsonResponse | null>(null);
  const [tableData, setTableData] = useState<MunicipalTableResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  async function fetchUfs() {
    const res = await fetch(`${API_BASE_URL}/monitoramento-risco-agro/ufs`);
    if (!res.ok) {
      throw new Error("Erro ao carregar UFs.");
    }

    const data: UfsResponse = await res.json();
    const loadedUfs = data.ufs || [];
    setUfs(loadedUfs);

    if (!selectedUf && loadedUfs.length > 0) {
      setSelectedUf(loadedUfs[0].abbr_uf);
    }
  }

  async function fetchMapAndTable(uf: string, window: WindowOption) {
    setLoading(true);
    setError(null);

    try {
      const [mapRes, tableRes] = await Promise.all([
        fetch(`${API_BASE_URL}/monitoramento-risco-agro/mapa`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uf, window }),
        }),
        fetch(`${API_BASE_URL}/monitoramento-risco-agro/municipios`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uf, window, limit: 500 }),
        }),
      ]);

      if (!mapRes.ok) {
        throw new Error("Erro ao carregar GeoJSON do mapa.");
      }

      if (!tableRes.ok) {
        throw new Error("Erro ao carregar tabela municipal.");
      }

      const mapJson: GeoJsonResponse = await mapRes.json();
      const tableJson: MunicipalTableResponse = await tableRes.json();

      setMapData(mapJson);
      setTableData(tableJson);
      setSelectedMunicipio("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os dados do mapa agroclimático.");
      setMapData(null);
      setTableData(null);
      setSelectedMunicipio("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUfs().catch((err) => {
      console.error(err);
      setError("Não foi possível carregar a lista de estados.");
    });
  }, []);

  useEffect(() => {
    if (!selectedUf) return;
    fetchMapAndTable(selectedUf, selectedWindow);
  }, [selectedUf, selectedWindow]);

  const selectedUfLabel = useMemo(() => {
    const found = ufs.find((u) => u.abbr_uf === selectedUf);
    return found ? `${found.abbr_uf} - ${found.name_uf}` : selectedUf || "-";
  }, [ufs, selectedUf]);

  const municipiosOptions = useMemo(() => {
    const items = tableData?.items || [];
    return [...items].sort((a, b) =>
      a.name_muni.localeCompare(b.name_muni, "pt-BR")
    );
  }, [tableData]);

  const filteredFeatures = useMemo(() => {
    const features = mapData?.features || [];

    if (!selectedMunicipio) {
      return features;
    }

    return features.filter(
      (feature) => feature.properties?.code_muni === selectedMunicipio
    );
  }, [mapData, selectedMunicipio]);

  const geoJsonObject = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: filteredFeatures,
    };
  }, [filteredFeatures]);

  const focusBounds = useMemo(() => {
    return computeBoundsFromFeatures(filteredFeatures);
  }, [filteredFeatures]);

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
      })
      .slice(0, 10);
  }, [tableData]);

  const selectedMunicipioItem = useMemo(() => {
    if (!selectedMunicipio || !tableData?.items) return null;
    return (
      tableData.items.find((item) => item.code_muni === selectedMunicipio) ||
      null
    );
  }, [selectedMunicipio, tableData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!focusBounds) return;

    try {
      map.fitBounds(focusBounds, {
        padding: [24, 24],
        maxZoom: selectedMunicipio ? 10 : 7,
      });
    } catch (err) {
      console.error("Erro ao ajustar bounds do mapa:", err);
    }
  }, [focusBounds, selectedMunicipio]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
              Mapa Agroclimático
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-100">
              Seca municipal — IIS/CEMADEN
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Visualização territorial integrada com DTB/IBGE e geobr, pronta
              para evoluir com clima, vegetação, produtividade e outras camadas
              agroclimáticas.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Estado</label>
            <select
              value={selectedUf}
              onChange={(e) => setSelectedUf(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {ufs.map((uf) => (
                <option key={uf.abbr_uf} value={uf.abbr_uf}>
                  {uf.abbr_uf} - {uf.name_uf}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Município
            </label>
            <select
              value={selectedMunicipio}
              onChange={(e) => setSelectedMunicipio(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
            >
              <option value="">Todos os municípios</option>
              {municipiosOptions.map((item) => (
                <option key={item.code_muni} value={item.code_muni}>
                  {item.name_muni}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Janela do IIS
            </label>
            <select
              value={selectedWindow}
              onChange={(e) =>
                setSelectedWindow(Number(e.target.value) as WindowOption)
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
            >
              <option value={1}>IIS 1 mês</option>
              <option value={3}>IIS 3 meses</option>
              <option value={6}>IIS 6 meses</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300 shadow-sm backdrop-blur">
          Carregando mapa agroclimático...
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-100">
                  Mapa territorial — {selectedUfLabel}
                  {selectedMunicipioItem
                    ? ` • ${selectedMunicipioItem.name_muni}`
                    : ""}
                </h3>
                <p className="text-sm text-slate-400">
                  Classe oficial do IIS por município.
                </p>
              </div>

              <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                Janela: {selectedWindow} mês{selectedWindow > 1 ? "es" : ""}
              </div>
            </div>

            <div className="h-[620px] overflow-hidden rounded-2xl border border-slate-800">
              <MapContainer
                center={[-14.235, -51.9253]}
                zoom={4}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                ref={(mapInstance) => {
                  if (mapInstance) {
                    mapRef.current = mapInstance;
                  }
                }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {geoJsonObject && (
                  <GeoJSON
                    key={`${selectedUf}-${selectedMunicipio}-${selectedWindow}-${filteredFeatures.length}`}
                    data={geoJsonObject as never}
                    style={(feature: any) => {
                      const rawValue = feature?.properties?.iis_value;
                      const value =
                        rawValue !== null &&
                        rawValue !== undefined &&
                        !Number.isNaN(Number(rawValue))
                          ? Number(rawValue)
                          : null;

                      return {
                        fillColor: getFillColor(value),
                        weight: selectedMunicipio ? 1.8 : 0.7,
                        opacity: 1,
                        color: selectedMunicipio ? "#e2e8f0" : "#0f172a",
                        fillOpacity: 0.82,
                      };
                    }}
                    onEachFeature={(feature: any, layer: any) => {
                      const props = feature?.properties || {};
                      const rawValue = props?.iis_value;
                      const value =
                        rawValue !== null &&
                        rawValue !== undefined &&
                        !Number.isNaN(Number(rawValue))
                          ? Number(rawValue)
                          : null;

                      layer.bindTooltip(
                        `
                          <div style="min-width: 200px;">
                            <div style="font-weight: 700; margin-bottom: 4px;">
                              ${props?.name_muni ?? "Município"}
                            </div>
                            <div>UF: ${props?.abbr_uf ?? "-"}</div>
                            <div>IIS (${props?.iis_window ?? selectedWindow}m): ${
                              value !== null
                                ? value.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })
                                : "-"
                            }</div>
                            <div>Classe IIS: ${getIisLabel(value)}</div>
                          </div>
                        `,
                        { sticky: true }
                      );
                    }}
                  />
                )}
              </MapContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center text-xs text-slate-300">
                <div
                  className="mx-auto mb-2 h-3 w-8 rounded"
                  style={{ backgroundColor: "#7f1d1d" }}
                />
                1 — Excepcional
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center text-xs text-slate-300">
                <div
                  className="mx-auto mb-2 h-3 w-8 rounded"
                  style={{ backgroundColor: "#b91c1c" }}
                />
                2 — Extrema
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center text-xs text-slate-300">
                <div
                  className="mx-auto mb-2 h-3 w-8 rounded"
                  style={{ backgroundColor: "#ea580c" }}
                />
                3 — Severa
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center text-xs text-slate-300">
                <div
                  className="mx-auto mb-2 h-3 w-8 rounded"
                  style={{ backgroundColor: "#facc15" }}
                />
                4 — Moderada
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center text-xs text-slate-300">
                <div
                  className="mx-auto mb-2 h-3 w-8 rounded"
                  style={{ backgroundColor: "#84cc16" }}
                />
                5 — Fraca
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center text-xs text-slate-300">
                <div
                  className="mx-auto mb-2 h-3 w-8 rounded"
                  style={{ backgroundColor: "#166534" }}
                />
                6 — Normal
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-slate-100">
                Resumo territorial
              </h3>
              <p className="text-sm text-slate-400">
                Recorte atual da seleção.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Estado
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {selectedUfLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Município
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {selectedMunicipioItem?.name_muni ?? "Todos os municípios"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Janela de análise
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  IIS {selectedWindow} mês{selectedWindow > 1 ? "es" : ""}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Municípios carregados no mapa
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {filteredFeatures.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Municípios na tabela
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {tableData?.count ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Top severidade disponível
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Classes 1, 2 e 3
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-slate-100">
                Top municípios no radar
              </h3>
              <p className="text-sm text-slate-400">
                Apenas municípios com IIS 1, 2 ou 3.
              </p>
            </div>

            <div className="space-y-2">
              {topMunicipios.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3 text-sm text-slate-400">
                  Nenhum município com classe 1, 2 ou 3 na seleção atual.
                </div>
              ) : (
                topMunicipios.map((item) => (
                  <div
                    key={`${item.code_muni}-${item.iis_window}`}
                    className="rounded-2xl border border-slate-800 bg-slate-800/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {item.name_muni}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.abbr_uf} • código {item.code_muni}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-100">
                          {formatNumber(item.iis_value, 0)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {getIisLabel(item.iis_value)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}