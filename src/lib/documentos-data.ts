import { statSync } from "node:fs";
import path from "node:path";

import darJson from "../../documentos/fuente/dar.json";
import banlistEstandarJson from "../../documentos/fuente/banlist-estandar.json";
import banlistInfanteriaJson from "../../documentos/fuente/banlist-infanteria.json";
import banlistVcrJson from "../../documentos/fuente/banlist-vcr.json";
import feDeErratasJson from "../../documentos/fuente/fe-de-erratas.json";
import {
  banlistSchema,
  darSchema,
  feDeErratasSchema,
  type Banlist,
  type Documento,
} from "./documentos";
import type { Formato } from "./types";

/**
 * Los datos del DAR, la Fe de Erratas y las tres Banlists, ya validados. Solo para Server
 * Components: se leen en el build, que es cuando se exporta la pagina, y un
 * JSON que no cumpla el esquema tumba el build en vez de publicarse roto.
 *
 * Va aparte de `documentos.ts` porque importa los JSON y `node:fs`: el test
 * de los esquemas corre en Node sin el bundler, y los lee con readFileSync.
 */

export const FE_DE_ERRATAS = feDeErratasSchema.parse(feDeErratasJson);
/** La Banlist de cada formato: Estandar, VCR e Infanteria. */
export const BANLISTS: Record<Formato, Banlist> = {
  estandar: banlistSchema.parse(banlistEstandarJson),
  vcr: banlistSchema.parse(banlistVcrJson),
  infanteria: banlistSchema.parse(banlistInfanteriaJson),
};
export const DAR = darSchema.parse(darJson);

/** El peso del PDF publicado, para decirlo junto al enlace ("733 KB"). */
export function pesoDelPdf(doc: Documento): string {
  const bytes = statSync(path.join(process.cwd(), "public", doc.pdf)).size;
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
