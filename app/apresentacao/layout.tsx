import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modo apresentação | Agro Intelligence Engine",
  description:
    "Roteiro guiado do terminal analítico para toda a equipe — mercado, macro, mapa e produção.",
};

export default function ApresentacaoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
