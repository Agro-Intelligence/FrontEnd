"use client";

import { useState } from "react";
import brazilMap from "@svg-maps/brazil";
import {
  MACRO_REGION_COLOR,
  MACRO_REGION_LABEL,
  macroRegionFromUf,
  type MacroRegionId,
} from "@/lib/conab-custo";

type BrazilMapJson = {
  viewBox: string;
  locations: { id: string; name: string; path: string }[];
};

const MAP = brazilMap as BrazilMapJson;

const LEGEND_ORDER: MacroRegionId[] = [
  "centro_oeste",
  "matopiba",
  "sul",
  "outras",
];

type Props = {
  /** UFs presentes no recorte CONAB (destaque visual). */
  ufsWithData?: Set<string>;
  className?: string;
};

export default function BrazilUfMap({ ufsWithData, className }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <div className={className}>
      <svg
        viewBox={MAP.viewBox}
        className="h-auto w-full max-h-[min(420px,55vh)] text-stone-800"
        role="img"
        aria-label="Mapa do Brasil com estados coloridos por macrorregião"
      >
        <title>Brasil por macrorregião</title>
        {MAP.locations.map((loc) => {
          const uf = loc.id.toUpperCase();
          const region = macroRegionFromUf(uf);
          const fill = MACRO_REGION_COLOR[region];
          const inData = ufsWithData?.has(uf) ?? true;
          const dim = ufsWithData && !inData;
          const isHover = hoverId === loc.id;

          return (
            <path
              key={loc.id}
              id={loc.id}
              d={loc.path}
              fill={fill}
              fillOpacity={dim ? 0.38 : isHover ? 0.95 : 0.88}
              stroke="#d6d3d1"
              strokeWidth={0.85}
              strokeLinejoin="round"
              className="transition-[fill-opacity] duration-150"
              onMouseEnter={() => setHoverId(loc.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                filter: isHover ? "brightness(1.08)" : undefined,
              }}
            >
              <title>{`${loc.name} (${uf}) — ${MACRO_REGION_LABEL[region]}`}</title>
            </path>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-stone-200 pt-3">
        {LEGEND_ORDER.map((rid) => (
          <span
            key={rid}
            className="inline-flex items-center gap-1.5 text-[11px] text-stone-600"
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-stone-300/80"
              style={{ backgroundColor: MACRO_REGION_COLOR[rid] }}
            />
            {MACRO_REGION_LABEL[rid]}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-stone-500">
        Estados sem dado no recorte aparecem mais claros. Mapa:{" "}
        <a
          href="https://github.com/VictorCazanave/svg-maps/tree/master/packages/brazil"
          className="text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-stone-800"
          target="_blank"
          rel="noopener noreferrer"
        >
          @svg-maps/brazil
        </a>{" "}
        (CC BY 4.0).
      </p>
    </div>
  );
}
