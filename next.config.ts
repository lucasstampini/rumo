import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` e `next build` em pastas separadas: dá para buildar com o dev server aberto.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
