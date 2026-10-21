import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas en el navegador (`pnpm run e2e`), contra el sitio YA construido:
 * lo que se prueba es lo que se publica, con su CSP y su export estatico.
 * Antes, `pnpm run build`.
 *
 * El servidor es el mismo `pnpm run preview` (python, sin dependencias). No
 * aplica `_headers`: la CSP la revisa `pnpm run audit`.
 *
 * El navegador no se baja con el install. Donde ya hay uno de Playwright
 * (`PLAYWRIGHT_BROWSERS_PATH`) se usa ese; si no, `pnpm exec playwright
 * install chromium` una vez.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "telefono", use: { ...devices["Pixel 7"] } },
    // Bajo `lg` (1024), con el menu plegado y el constructor en hoja, pero con
    // mas columnas que el telefono. El dispositivo es de Safari: se fuerza
    // Chromium, que es el navegador que hay.
    { name: "tableta", use: { ...devices["iPad Mini"], browserName: "chromium" } },
  ],
  webServer: {
    command: "pnpm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    // http.server anota cada pedido por stderr: ruido en la salida.
    stderr: "ignore",
  },
});
