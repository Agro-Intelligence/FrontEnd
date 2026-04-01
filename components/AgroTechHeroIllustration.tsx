/**
 * Ilustração vetorial premium: Brasil Digital + Satélites + Inteligência de Dados.
 * Estilo "Digital Architect": Sofisticação, profundidade e precisão técnica.
 */
export function AgroTechHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 520"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        {/* Fundo Bege Principal */}
        <linearGradient id="ath-grad-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EAEAE5" />
          <stop offset="100%" stopColor="#D6D3D1" />
        </linearGradient>
        
        {/* Glow de sinal do satélite */}
        <radialGradient id="ath-beam-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0071B9" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0071B9" stopOpacity="0" />
        </radialGradient>

        {/* Gradiente para o contorno do Brasil */}
        <linearGradient id="ath-br-mesh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0071B9" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#726A3C" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0071B9" stopOpacity="0.3" />
        </linearGradient>

        {/* Filtro de brilho para pontos ativos */}
        <filter id="ath-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Base Layer */}
      <rect width="800" height="520" fill="url(#ath-grad-bg)" />

      {/* 2. Grid de Fundo (Perspectiva Global) */}
      <g opacity="0.04" stroke="#1C1917" strokeWidth="0.5">
        {[...Array(12)].map((_, i) => (
          <line key={`lat-${i}`} x1="0" y1={i * 48} x2="800" y2={i * 48} />
        ))}
        {[...Array(18)].map((_, i) => (
          <line key={`lon-${i}`} x1={i * 48} y1="0" x2={i * 48} y2="520" />
        ))}
      </g>

      {/* 3. Mapa do Brasil (Estilo Mesh Digital) - POSIÇÃO CENTRALIZADA */}
      <g transform="translate(350, 60) scale(1.25)" opacity="0.25">
        {/* Sombra projetada sutil */}
        <path
          fill="#1C1917"
          fillOpacity="0.03"
          transform="translate(4, 4)"
          d="M 134.70 320.68 L 145.04 308.66 L 153.78 300.10 L 165.50 291.64 L 165.66 284.60 L 161.77 279.51 L 159.46 276.11 L 160.51 266.05 L 151.02 262.09 L 143.62 248.99 L 132.29 249.03 L 132.80 237.06 L 135.69 214.50 L 128.80 203.06 L 115.09 197.60 L 112.11 187.34 L 103.05 173.19 L 91.56 165.58 L 82.89 164.13 L 74.48 156.23 L 74.15 146.93 L 64.84 141.81 L 53.99 148.70 L 42.52 150.81 L 35.14 137.92 L 21.96 142.89 L 13.89 137.68 L 8.00 120.59 L 14.72 112.70 L 16.48 100.75 L 32.72 91.73 L 43.18 67.97 L 38.72 55.88 L 43.12 48.02 L 44.93 45.55 L 40.29 39.12 L 57.94 36.28 L 61.60 44.28 L 67.33 47.86 L 74.85 44.59 L 84.70 37.35 L 90.23 34.84 L 83.25 32.23 L 82.17 26.67 L 79.02 18.48 L 86.20 18.79 L 94.60 18.91 L 108.83 14.24 L 114.66 8.00 L 118.12 15.24 L 117.74 22.44 L 118.49 34.41 L 123.82 42.62 L 128.48 41.34 L 134.43 39.41 L 141.23 37.81 L 147.32 38.22 L 146.72 34.66 L 150.62 32.89 L 158.71 33.86 L 164.49 33.29 L 167.28 36.14 L 173.96 32.16 L 180.91 17.60 L 185.47 22.06 L 193.95 38.93 L 194.16 45.02 L 188.34 52.28 L 204.43 56.32 L 210.60 59.37 L 233.20 67.93 L 236.98 73.09 L 244.72 75.26 L 259.79 79.92 L 271.36 79.58 L 282.80 86.87 L 292.69 96.75 L 298.66 99.30 L 305.28 99.65 L 308.09 102.43 L 310.71 113.66 L 312.00 118.99 L 308.92 133.57 L 304.98 139.33 L 294.06 151.60 L 289.13 161.56 L 283.40 169.21 L 279.30 175.87 L 279.85 192.39 L 277.69 205.98 L 276.86 211.79 L 274.42 215.27 L 273.04 227.06 L 265.19 238.57 L 263.87 247.68 L 257.61 251.50 L 255.79 256.78 L 247.38 256.76 L 235.20 260.15 L 229.74 264.07 L 221.07 266.65 L 211.96 273.67 L 205.40 282.42 L 204.28 289.00 L 205.56 293.87 L 204.12 302.78 L 202.36 307.08 L 196.95 311.93 L 188.36 327.45 L 181.55 334.45 L 176.28 338.57 L 172.75 346.96 L 167.63 352.00 L 165.48 347.01 L 168.90 342.82 L 164.42 336.82 L 158.34 331.95 L 150.38 326.30 L 147.50 326.56 L 139.73 319.74 L 134.70 320.68 Z"
        />
        {/* Contorno Principal */}
        <path
          fill="none"
          stroke="url(#ath-br-mesh)"
          strokeWidth="1.2"
          d="M 134.70 320.68 L 145.04 308.66 L 153.78 300.10 L 165.50 291.64 L 165.66 284.60 L 161.77 279.51 L 157.93 281.20 L 159.46 276.11 L 160.51 266.05 L 151.02 262.09 L 143.62 248.99 L 132.29 249.03 L 132.80 237.06 L 135.69 214.50 L 128.80 203.06 L 115.09 197.60 L 112.11 187.34 L 103.05 173.19 L 91.56 165.58 L 82.89 164.13 L 74.48 156.23 L 74.15 146.93 L 64.84 141.81 L 53.99 148.70 L 42.52 150.81 L 35.14 137.92 L 21.96 142.89 L 13.89 137.68 L 8.00 120.59 L 14.72 112.70 L 16.48 100.75 L 32.72 91.73 L 43.18 67.97 L 38.72 55.88 L 43.12 48.02 L 44.93 45.55 L 40.29 39.12 L 57.94 36.28 L 61.60 44.28 L 67.33 47.86 L 74.85 44.59 L 84.70 37.35 L 90.23 34.84 L 83.25 32.23 L 82.17 26.67 L 79.02 18.48 L 86.20 18.79 L 94.60 18.91 L 108.83 14.24 L 114.66 8.00 L 118.12 15.24 L 117.74 22.44 L 118.49 34.41 L 123.82 42.62 L 128.48 41.34 L 134.43 39.41 L 141.23 37.81 L 147.32 38.22 L 146.72 34.66 L 150.62 32.89 L 158.71 33.86 L 164.49 33.29 L 167.28 36.14 L 173.96 32.16 L 180.91 17.60 L 185.47 22.06 L 193.95 38.93 L 194.16 45.02 L 188.34 52.28 L 204.43 56.32 L 210.60 59.37 L 233.20 67.93 L 236.98 73.09 L 244.72 75.26 L 259.79 79.92 L 271.36 79.58 L 282.80 86.87 L 292.69 96.75 L 298.66 99.30 L 305.28 99.65 L 308.09 102.43 L 310.71 113.66 L 312.00 118.99 L 308.92 133.57 L 304.98 139.33 L 294.06 151.60 L 289.13 161.56 L 283.40 169.21 L 279.30 175.87 L 279.85 192.39 L 277.69 205.98 L 276.86 211.79 L 274.42 215.27 L 273.04 227.06 L 265.19 238.57 L 263.87 247.68 L 257.61 251.50 L 255.79 256.78 L 247.38 256.76 L 235.20 260.15 L 229.74 264.07 L 221.07 266.65 L 211.96 273.67 L 205.40 282.42 L 204.28 289.00 L 205.56 293.87 L 204.12 302.78 L 202.36 307.08 L 196.95 311.93 L 188.36 327.45 L 181.55 334.45 L 176.28 338.57 L 172.75 346.96 L 167.63 352.00 L 165.48 347.01 L 168.90 342.82 L 164.42 336.82 L 158.34 331.95 L 150.38 326.30 L 147.50 326.56 L 139.73 319.74 L 134.70 320.68 Z"
        />
        {/* Linhas de Conexão Internas (Nodes) */}
        <g stroke="#0071B9" strokeWidth="0.3" strokeOpacity="0.4">
          <line x1="134" y1="320" x2="204" y2="289" />
          <line x1="204" y1="289" x2="259" y2="238" />
          <line x1="259" y1="238" x2="141" y2="139" />
          <line x1="141" y1="139" x2="118" y2="15" />
        </g>
      </g>

      {/* 4. Satélites de Alta Precisão (HUD) - MOVIMENTO ORBITAL */}
      <g>
        {/* Satélite Alpha (Foco em Inteligência) */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="100,80; 250,60; 100,80"
            dur="25s"
            repeatCount="indefinite"
          />
          <g opacity="0.6">
            {/* Corpo do Satélite */}
            <rect x="-12" y="-8" width="24" height="16" rx="1" fill="#1C1917" />
            {/* Painéis Solares */}
            <rect x="-32" y="-6" width="20" height="12" fill="#0071B9" fillOpacity="0.4" stroke="#0071B9" strokeWidth="0.5" />
            <rect x="12" y="-6" width="20" height="12" fill="#0071B9" fillOpacity="0.4" stroke="#0071B9" strokeWidth="0.5" />
            {/* Lente/Antena */}
            <circle cx="0" cy="0" r="3" fill="#66AAD5" />
          </g>
          {/* Feixe de Dados (Beam) - Segue o satélite */}
          <path d="M 0 10 L 350 180" stroke="#0071B9" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.15" />
        </g>

        {/* Satélite Beta (Foco em Clima/Agro) */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="660,180; 580,250; 660,180"
            dur="30s"
            repeatCount="indefinite"
          />
          <g opacity="0.5">
            <circle cx="0" cy="0" r="10" stroke="#726A3C" strokeWidth="1.5" />
            <line x1="-18" y1="0" x2="18" y2="0" stroke="#726A3C" strokeWidth="1" />
            <line x1="0" y1="-18" x2="0" y2="18" stroke="#726A3C" strokeWidth="1" />
          </g>
          <path d="M -10 10 L -150 150" stroke="#726A3C" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.15" />
        </g>
      </g>

      {/* 5. Pontos de Dados Ativos (Animação) - POSIÇÕES AJUSTADAS PARA DENTRO DO MAPA */}
      <g filter="url(#ath-glow-filter)">
        {/* Mato Grosso (Centro de Dados Principal) */}
        <g transform="translate(460, 230)">
          <circle r="4" fill="#0071B9">
            <animate attributeName="r" values="3;6;3" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="1;0.4;1" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle r="12" stroke="#0071B9" strokeWidth="0.5" strokeOpacity="0.3">
            <animate attributeName="r" values="8;18;8" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* São Paulo / Paraná (Ponto Secundário Pulsante) */}
        <g transform="translate(520, 340)">
          <circle r="3" fill="#726A3C">
            <animate attributeName="r" values="2;4;2" dur="3.2s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.8;0.3;0.8" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle r="8" stroke="#726A3C" strokeWidth="0.4" strokeOpacity="0.2">
            <animate attributeName="r" values="5;12;5" dur="3.2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Rio Grande do Sul (Ponto Secundário Pulsante) */}
        <g transform="translate(490, 400)">
          <circle r="3" fill="#0071B9">
            <animate attributeName="r" values="2;4.5;2" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.9;0.4;0.9" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle r="10" stroke="#0071B9" strokeWidth="0.4" strokeOpacity="0.25">
            <animate attributeName="r" values="6;14;6" dur="2.8s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Nordeste / MATOPIBA (Ponto Secundário Pulsante) */}
        <g transform="translate(600, 190)">
          <circle r="2.5" fill="#726A3C">
            <animate attributeName="r" values="1.5;3.5;1.5" dur="4s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.7;0.2;0.7" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle r="7" stroke="#726A3C" strokeWidth="0.3" strokeOpacity="0.15">
            <animate attributeName="r" values="4;10;4" dur="4s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>

      {/* 6. HUD de Telemetria (Canto Inferior Direito) */}
      <g transform="translate(700, 440)" opacity="0.15">
        <circle r="50" stroke="#1C1917" strokeWidth="0.5" />
        <circle r="38" stroke="#1C1917" strokeWidth="0.5" strokeDasharray="2 2" />
        <path d="M -60 0 L 60 0 M 0 -60 L 0 60" stroke="#1C1917" strokeWidth="0.5" />
        {/* Pequenos textos de coordenadas simulados */}
        <rect x="10" y="10" width="20" height="2" fill="#1C1917" />
        <rect x="10" y="16" width="15" height="2" fill="#1C1917" />
      </g>

      {/* 7. Vinheta de Profundidade */}
      <rect width="800" height="520" fill="url(#ath-vignette-final)" pointerEvents="none" />
      <defs>
        <radialGradient id="ath-vignette-final" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="#EAEAE5" stopOpacity="0" />
          <stop offset="100%" stopColor="#D6D3D1" stopOpacity="0.2" />
        </radialGradient>
      </defs>
    </svg>
  );
}
