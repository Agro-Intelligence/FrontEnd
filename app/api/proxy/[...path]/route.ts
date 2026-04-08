import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function resolveBackendBaseUrl(): string {
  const privateUrl = process.env.API_BASE_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const chosen = privateUrl || publicUrl || "";
  if (!chosen || !/^https?:\/\//i.test(chosen)) {
    throw new Error(
      "API_BASE_URL/NEXT_PUBLIC_API_BASE_URL não configurada no frontend."
    );
  }
  return chosen.replace(/\/$/, "");
}

function copyRequestHeaders(req: NextRequest): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });
  return out;
}

function copyResponseHeaders(source: Headers): Headers {
  const out = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });
  return out;
}

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  let base: string;
  try {
    base = resolveBackendBaseUrl();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy sem configuração.";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }

  const qs = req.nextUrl.search ?? "";
  const target = `${base}/${path.join("/")}${qs}`;
  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const upstream = await fetch(target, {
    method,
    headers: copyRequestHeaders(req),
    body: hasBody ? req.body : undefined,
    redirect: "manual",
    cache: "no-store",
    duplex: hasBody ? "half" : undefined,
  } as RequestInit);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream.headers),
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxy(req, path);
}
