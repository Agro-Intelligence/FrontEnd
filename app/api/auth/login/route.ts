import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthConfig } from "@/lib/auth";

type LoginPayload = {
  password?: string;
};

export async function POST(request: Request) {
  const { enabled, password, sessionToken } = getAuthConfig();
  if (!enabled) {
    return NextResponse.json(
      { ok: false, message: "Autenticação privada não está habilitada." },
      { status: 503 }
    );
  }

  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Payload inválido." },
      { status: 400 }
    );
  }

  if (!payload.password || payload.password !== password) {
    return NextResponse.json(
      { ok: false, message: "Senha inválida." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
