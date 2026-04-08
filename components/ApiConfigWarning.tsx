"use client";

import { useEffect } from "react";
import { warnIfImplicitApiBaseInProduction } from "@/lib/api-base";

/** Montar uma vez no layout: avisa no console se a API não foi configurada em produção. */
export function ApiConfigWarning() {
  useEffect(() => {
    warnIfImplicitApiBaseInProduction();
  }, []);
  return null;
}
