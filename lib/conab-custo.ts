/**
 * Tipos e classificação por UF alinhados à API FastAPI (`/conab/custo-producao`)
 * e ao parser em `backend/app/services/conab_portal_service.py`.
 */

export type MacroRegionId = "centro_oeste" | "matopiba" | "sul" | "outras";

export const MACRO_REGION_LABEL: Record<MacroRegionId, string> = {
  centro_oeste: "Centro-Oeste",
  matopiba: "Matopiba",
  sul: "Sul",
  outras: "Outras regiões",
};

export const MACRO_REGION_COLOR: Record<MacroRegionId, string> = {
  centro_oeste: "#166534",
  matopiba: "#ea580c",
  sul: "#1d4ed8",
  outras: "#ca8a04",
};

export type RegionAggregate = {
  id: MacroRegionId;
  label: string;
  color: string;
  n_obs: number;
  produtividade_sc_ha: number | null;
  custo_total_ha: number | null;
  custo_saca_r$: number | null;
  remun_fator_sc_r$: number | null;
  leitura: string;
};

export type ConabSoySummary = {
  source: string;
  produto: string;
  id_produto: number;
  latest_ano_mes: number;
  latest_label: string;
  empreendimento_filter: string;
  nacional: {
    custo_saca_mediana: number | null;
    custo_ha_mediana: number | null;
    produtividade_mediana: number | null;
  };
  regioes: RegionAggregate[];
  uf_por_regiao: Record<MacroRegionId, string[]>;
};

/** Classificação usada no painel (alinhada à tabela regional). */
export function macroRegionFromUf(uf: string): MacroRegionId {
  const u = uf.trim().toUpperCase();
  if (["DF", "GO", "MT", "MS"].includes(u)) return "centro_oeste";
  if (["MA", "PI", "TO", "BA"].includes(u)) return "matopiba";
  if (["PR", "SC", "RS"].includes(u)) return "sul";
  return "outras";
}
