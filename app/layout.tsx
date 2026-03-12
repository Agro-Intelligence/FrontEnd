import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hedge Lab Editorial Portal",
  description: "Portal analítico para hedge e forecast de commodities da B3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}