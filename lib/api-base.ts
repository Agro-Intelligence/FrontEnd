export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured && configured.startsWith("http")) {
    return configured.replace(/\/$/, "");
  }

  // Em produção (Vercel), evita fallback quebrado para :8000 no domínio do front.
  // O proxy interno usa API_BASE_URL/NEXT_PUBLIC_API_BASE_URL no servidor.
  return "/api/proxy";
}

/** True quando `NEXT_PUBLIC_API_BASE_URL` foi definida no build (URL absoluta com http/https). */
export function isExplicitApiBaseConfigured(): boolean {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return Boolean(configured && configured.startsWith("http"));
}

/**
 * Avisa no console se o front está em host “não local” sem URL de API explícita
 * (o fallback `:8000` no mesmo host quebra na Vercel e gera "Failed to fetch").
 */
export function warnIfImplicitApiBaseInProduction(): void {
  if (typeof window === "undefined") return;
  if (isExplicitApiBaseConfigured()) return;

  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local");
  if (isLocal) return;

  console.warn(
    "[Hedge Lab] NEXT_PUBLIC_API_BASE_URL não está definida no build. " +
      "O frontend usará /api/proxy como fallback (recomendado apenas temporariamente). " +
      "Defina NEXT_PUBLIC_API_BASE_URL com a URL HTTPS da API e faça redeploy do frontend. " +
      "No backend, inclua a URL do front em CORS_ORIGINS. " +
      "Guia: docs/DEPLOY_RENDER_RAILWAY_VERCEL.md"
  );
}

/** Mensagem amigável quando fetch falha na rede (antes de HTTP). */
export function formatNetworkFetchError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  const isNetworkFail =
    msg === "Failed to fetch" ||
    msg === "NetworkError when attempting to fetch resource." ||
    /load failed/i.test(msg);
  if (!isNetworkFail) {
    return msg || fallback;
  }
  return (
    "Não foi possível conectar à API. Em produção, defina NEXT_PUBLIC_API_BASE_URL no Vercel " +
    "(URL HTTPS do backend) e CORS_ORIGINS no Railway com a URL exata do frontend; " +
    "veja docs/DEPLOY_RENDER_RAILWAY_VERCEL.md."
  );
}
