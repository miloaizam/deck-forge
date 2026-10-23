import { getCards } from "@/lib/cards";
import { gruposDePortada } from "@/lib/destacadas";

/**
 * `/data/portada.json`: con que carta va cada id, para que la cinta de la
 * portada agrupe el ranking de la Comunidad sin bajar el catalogo entero
 * (`src/lib/destacadas.ts`). Se escribe en el build, como cualquier pagina.
 */
export const dynamic = "force-static";

export async function GET() {
  return Response.json(gruposDePortada(await getCards()));
}
