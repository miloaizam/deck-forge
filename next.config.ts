import type { NextConfig } from "next";

/**
 * DeckForge se publica como sitio 100% estatico en Cloudflare Workers
 * (Static Assets, ver wrangler.jsonc).
 * `output: "export"` genera HTML/CSS/JS puros en `out/`: sin servidor,
 * sin API routes y sin middleware. Ver CLAUDE.md antes de tocar esto.
 */
const nextConfig: NextConfig = {
  output: "export",
  // No hay optimizador de imagenes sin servidor: las WebP ya vienen
  // redimensionadas desde scripts/convert_images.py.
  images: { unoptimized: true },
  // `/baraja` -> `/baraja/index.html`: cada ruta es una carpeta con su index
  // y los enlaces internos llevan la barra final. Las reglas por pagina de
  // out/_headers (scripts/csp-hashes.mjs) casan con esa forma: `/baraja/`.
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
