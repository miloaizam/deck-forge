import path from "node:path";

import { expect, type Page } from "@playwright/test";

/**
 * axe-core sobre la pagina, para `accesibilidad.spec.ts` y `nube.spec.ts`:
 * falla con cualquier violacion seria o critica de WCAG 2.2 AA.
 */

// Playwright corre desde la raiz del repo (playwright.config.ts).
const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

interface Violacion {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
}

/** Corre axe sobre la pagina tal como esta y devuelve lo serio. */
async function revisar(page: Page): Promise<Violacion[]> {
  await page.addScriptTag({ path: AXE });
  const violaciones = await page.evaluate(async () => {
    // axe queda global al inyectarlo; no hay tipos en la pagina.
    const axe = (
      window as unknown as {
        axe: { run: (o: unknown) => Promise<{ violations: Violacion[] }> };
      }
    ).axe;
    const r = await axe.run({
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return r.violations;
  });
  return violaciones.filter((v) => v.impact === "serious" || v.impact === "critical");
}

function informe(v: Violacion[]): string {
  return v
    .map(
      (x) =>
        `${x.id} (${x.impact}): ${x.help}\n` +
        x.nodes
          .slice(0, 5)
          .map(
            (n) =>
              `  ${n.target.join(" ")}\n    ${n.failureSummary?.split("\n").join("\n    ")}`,
          )
          .join("\n"),
    )
    .join("\n\n");
}

export async function sinViolaciones(page: Page, donde: string) {
  // Las animaciones de entrada (`aparece`) pintan a media opacidad y los
  // colores cambian con transicion: axe mediria un contraste que no es el
  // final. Se espera a que la pagina quede QUIETA: la red en reposo (el
  // catalogo llega aparte del HTML y hay vistas que cambian al tenerlo, como la
  // pestana de la coleccion que pide la URL) y dos miradas seguidas, separadas
  // por 250 ms, sin animaciones finitas ni View Transition. El latido de una
  // imagen que carga es infinito y no cuenta. Un tiempo fijo no alcanzaba con
  // la maquina cargada.
  await page.waitForLoadState("networkidle");
  const quieta = () =>
    page.evaluate(
      () =>
        !document.documentElement.matches(":active-view-transition") &&
        document
          .getAnimations()
          .every(
            (a) =>
              a.playState !== "running" || a.effect?.getTiming().iterations === Infinity,
          ),
    );
  for (let seguidas = 0; seguidas < 2;) {
    await page.waitForTimeout(250);
    seguidas = (await quieta()) ? seguidas + 1 : 0;
  }
  const v = await revisar(page);
  expect(v, `${donde}\n${informe(v)}`).toEqual([]);
}
