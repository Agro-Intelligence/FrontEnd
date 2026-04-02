"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = useMemo(() => {
    const candidate = searchParams.get("next") || "/";
    return candidate.startsWith("/") ? candidate : "/";
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Falha ao autenticar.");
      }
      router.replace(nextUrl);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível entrar.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-dark font-brand overflow-hidden relative">
      <div className="grid-guide">
        <div className="hidden md:block md:col-span-3 grid-guide-col"></div>
        <div className="hidden md:block md:col-span-6 grid-guide-col"></div>
        <div className="hidden md:block md:col-span-3 h-full"></div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col border-x border-brand-stone-300 bg-brand-bg/80 backdrop-blur-[2px]">
        <header className="border-b border-brand-stone-300 sticky top-0 bg-brand-bg/90 backdrop-blur-md z-50">
          <div className="flex justify-between items-center px-6 py-5">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand-stone-500">
              Área Privada
            </span>
            <img
              src="/logo-timac.png"
              alt="TIMAC AGRO"
              className="h-10 w-auto object-contain"
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-stone-500">
              Hedge Lab
            </span>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-12 flex-1">
          <div className="col-span-1 md:col-span-7 border-r border-brand-stone-300 p-8 md:p-16 flex flex-col justify-center">
            <span className="px-3 py-1 border border-brand-dark/20 rounded-full text-[10px] font-mono uppercase tracking-widest bg-white/50 w-fit">
              Acesso Interno
            </span>
            <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tighter leading-tight text-brand-dark">
              Monitor
              <br />
              <span className="text-brand-blue">Privado</span>
            </h1>
            <p className="mt-8 max-w-xl text-base md:text-lg leading-relaxed text-brand-stone-500">
              Este ambiente é restrito. Informe a senha interna para acessar os
              módulos analíticos.
            </p>
          </div>

          <div className="col-span-1 md:col-span-5 p-8 md:p-12 flex items-center">
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-3xl border border-brand-stone-300 bg-white/60 p-8 shadow-sm"
            >
              <label
                htmlFor="password"
                className="text-[10px] font-bold uppercase tracking-widest text-brand-stone-500"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-brand-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              {error ? (
                <p className="mt-4 text-xs font-medium text-rose-700">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="btn-timac btn-timac-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Validando..." : "Entrar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-brand-bg text-brand-dark font-brand overflow-hidden relative">
          <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] items-center justify-center border-x border-brand-stone-300 bg-brand-bg/80 px-6">
            <div className="rounded-2xl border border-brand-stone-300 bg-white px-6 py-4 text-sm text-brand-stone-500">
              Carregando login privado...
            </div>
          </div>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
