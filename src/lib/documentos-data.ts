import { statSync } from "node:fs";
import path from "node:path";

import banlistJson from "../../documentos/fuente/banlist-estandar.json";
import feDeErratasJson from "../../documentos/fuente/fe-de-erratas.json";
import { banlistSchema, feDeErratasSchema, type Documento } from "./documentos";

/**
 * Los datos de la Fe de Erratas y la Banlist, ya validados. Solo para Server
 * Components: se leen en el build, que es cuando se exporta la pagina, y un
 * JSON que no cumpla el esquema tumba el build en vez de publicarse roto.
 *
 * Va aparte de `documentos.ts` porque importa los JSON y `node:fs`: el test
 * de los esquemas corre en Node sin el bundler, y los lee con readFileSync.
 */

export const FE_DE_ERRATAS = feDeErratasSchema.parse(feDeErratasJson);
export const BANLIST = banlistSchema.parse(banlistJson);

/** El peso del PDF publicado, para decirlo junto al enlace ("733 KB"). */
export function pesoDelPdf(doc: Documento): string {
  const bytes = statSync(path.join(process.cwd(), "public", doc.pdf)).size;
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
