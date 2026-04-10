export function getApiBaseUrl(): string {
  // O frontend cliente fala sempre com o proxy interno do Next.
  // Isso evita falhas de CORS entre Vercel e um backend publicado noutro serviço.
  return "/api/proxy";
}

/**
 * Mantido como no-op para evitar avisos enganosos no browser quando o deploy usa
 * apenas `API_BASE_URL` no servidor da Vercel.
 */
export function warnIfImplicitApiBaseInProduction(): void {
  return;
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
    "Não foi possível conectar à API. Em produção, defina API_BASE_URL " +
    "(ou NEXT_PUBLIC_API_BASE_URL) no Vercel com a URL HTTPS do backend e valide o deploy da API; " +
    "veja docs/DEPLOY_RENDER_RAILWAY_VERCEL.md."
  );
}
