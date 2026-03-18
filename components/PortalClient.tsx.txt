"use client";

import dynamic from "next/dynamic";

const HedgeEditorialPortal = dynamic(
  () => import("@/components/HedgeEditorialPortal"),
  { ssr: false }
);

export default function PortalClient() {
  return <HedgeEditorialPortal />;
}