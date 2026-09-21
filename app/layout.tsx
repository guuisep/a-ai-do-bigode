import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Açaí do Bigode",
  description: "Açaí que faz o bigode sorrir",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#3B1364",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen text-acai-dark antialiased">
        {children}
      </body>
    </html>
  );
}
