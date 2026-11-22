import type { Metadata, Viewport } from "next";
import { Archivo, Figtree } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "RUMO", template: "%s · RUMO" },
  description:
    "RUMO: aluguel de carros entre vizinhos. Seu carro parado vira renda. O do vizinho vira seu rumo.",
};

export const viewport: Viewport = {
  themeColor: "#159a58",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${archivo.variable} ${figtree.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
