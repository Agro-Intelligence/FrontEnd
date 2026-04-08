import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ApiConfigWarning } from "@/components/ApiConfigWarning";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monitor de Risco TimacAgro",
  description: "Sistema de monitoramento de risco e inteligência de mercado",
  icons: {
    icon: [
      { url: "/favicon.ico?v=5", sizes: "any" },
      { url: "/favicon.png?v=5", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png?v=5", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body
        className={`${inter.className} antialiased selection:bg-stone-800 selection:text-white`}
      >
        <ApiConfigWarning />
        {children}
      </body>
    </html>
  );
}