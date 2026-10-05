import { CARD_RATIO } from "./CardTile";
import { COLUMNAS_GRILLA } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Esqueletos de carga: la forma de lo que viene, en gris y latiendo, mientras
 * llega. Sin spinner, que no dice nada de lo que va a aparecer ni de donde.
 *
 * Todos son decorado (`aria-hidden`). Lo que se anuncia es el `aria-busy` y el
 * "Cargando…" de `PageSkeleton`, una vez por pantalla y no por bloque.
 *
 * Con "reducir movimiento" el latido se queda quieto (globals.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("bg-panel animate-pulse rounded", className)} />
  );
}

/** Una carta de la grilla: el arte y las dos lineas de texto de debajo. */
function CardSkeleton() {
  return (
    <div className="border-line rounded-card overflow-hidden border">
      <div
        aria-hidden="true"
        className="bg-panel animate-pulse"
        style={{ aspectRatio: CARD_RATIO }}
      />
      <div className="flex flex-col gap-1.5 px-2.5 py-2.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  variante = "catalogo",
  cuantas = 14,
}: {
  variante?: "catalogo" | "constructor";
  cuantas?: number;
}) {
  return (
    <ul aria-hidden="true" className="flex flex-wrap justify-center gap-4">
      {Array.from({ length: cuantas }, (_, i) => (
        <li key={i} className={COLUMNAS_GRILLA[variante]}>
          <CardSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** La fila de buscador y botones de filtros que abre el catalogo. */
function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="rounded-chip h-11 min-w-60 flex-1" />
      <Skeleton className="rounded-chip h-11 w-28" />
    </div>
  );
}

/** Las tarjetas de Mis barajas. */
export function DeckListSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className="border-line rounded-panel flex gap-3 border p-3.5">
          <Skeleton className="h-[131px] w-[92px] shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <div className="mt-auto flex gap-1.5">
              <Skeleton className="rounded-chip h-9 w-20" />
              <Skeleton className="rounded-chip size-9" />
              <Skeleton className="rounded-chip size-9" />
              <Skeleton className="rounded-chip size-9" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** La coleccion: el resumen, los filtros y las filas de la lista. */
export function ColeccionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Skeleton className="rounded-panel h-52" />
        <Skeleton className="rounded-panel h-52" />
      </div>
      <FiltersSkeleton />
      <Skeleton className="rounded-chip h-11 w-60" />
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <li
            key={i}
            className="border-line rounded-card flex items-center gap-3 border p-1.5"
          >
            <Skeleton className="h-[51px] w-9 shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** El detalle de una baraja: cabecera con acciones y una mesa de cartas. */
export function DeckDetailSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="rounded-chip h-11 w-24" />
          <Skeleton className="rounded-chip size-11" />
          <Skeleton className="rounded-chip size-11" />
        </div>
      </div>
      <Skeleton className="rounded-panel h-32 w-full" />
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="bg-panel rounded-card animate-pulse"
            style={{ aspectRatio: CARD_RATIO }}
          />
        ))}
      </div>
    </div>
  );
}

/** El panel de la baraja del constructor, en escritorio. */
function DeckPanelSkeleton() {
  return (
    <div className="border-line rounded-panel hidden flex-col gap-4 border p-4 lg:flex">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="rounded-chip h-11 w-full" />
      <Skeleton className="rounded-chip h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** Una lista de bloques de texto: novedades, documentos. */
function TextListSkeleton() {
  return (
    <div aria-hidden="true" className="flex max-w-[760px] flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="border-line rounded-card flex flex-col gap-2 border p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export type PageSkeletonVariant =
  "catalogo" | "constructor" | "barajas" | "coleccion" | "baraja" | "texto";

/**
 * La pantalla entera mientras llega una pagina (los `loading.tsx` de cada
 * ruta). Repite el <main> de las paginas, con el mismo ancho y los mismos
 * margenes, para que al llegar el contenido nada se mueva de sitio.
 */
export function PageSkeleton({ variante }: { variante: PageSkeletonVariant }) {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6"
    >
      <p className="sr-only" role="status">
        Cargando…
      </p>
      {variante !== "baraja" && (
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
        </div>
      )}

      <div className={cn(variante !== "baraja" && "mt-10")}>
        {variante === "catalogo" && (
          <div className="flex flex-col gap-5">
            <FiltersSkeleton />
            <CardGridSkeleton />
          </div>
        )}
        {variante === "constructor" && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start lg:gap-6">
            <div className="flex flex-col gap-5">
              <FiltersSkeleton />
              <CardGridSkeleton variante="constructor" cuantas={12} />
            </div>
            <DeckPanelSkeleton />
          </div>
        )}
        {variante === "barajas" && <DeckListSkeleton />}
        {variante === "coleccion" && <ColeccionSkeleton />}
        {variante === "baraja" && <DeckDetailSkeleton />}
        {variante === "texto" && <TextListSkeleton />}
      </div>
    </main>
  );
}
