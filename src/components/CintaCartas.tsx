"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";

import { api } from "@/components/nube/api";
import {
  MIN_BARAJAS,
  elegirDestacadas,
  leerFilas,
  leerGrupos,
  type CartaCinta,
} from "@/lib/destacadas";
import { NUBE_ACTIVA } from "@/lib/supabase-config";
import { BOTON_ICONO_COMPACTO, CARD_RATIO, CONTORNO_CARTA } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** Segundos que tarda cada carta en cruzar su propio ancho: la velocidad. */
const SEGUNDOS_POR_CARTA = 4.5;

/** Lo que dura el fundido al cambiar el grupo fijo por el ranking. */
const FUNDIDO_MS = 300;

/**
 * El ranking de la Comunidad, o `null` si no hay (nube apagada, sin red, pocas
 * barajas). Primero la funcion de la base, que es chica; el archivo de grupos
 * (~24 KB) solo si hay ranking que agrupar.
 */
async function pedirDestacadas(): Promise<CartaCinta[] | null> {
  try {
    const filas = leerFilas(
      await api("rpc/cartas_destacadas", { metodo: "POST", cuerpo: {} }),
    );
    // Con pocas barajas no se baja el archivo en vano.
    if (!filas || filas.length === 0 || filas[0].total < MIN_BARAJAS) return null;
    const res = await fetch("/data/portada.json");
    if (!res.ok) return null;
    const grupos = leerGrupos(await res.json());
    return grupos ? elegirDestacadas(filas, grupos) : null;
  } catch {
    return null;
  }
}

/** Tras la carga y con el hilo libre: la cinta no compite con lo que se ve primero. */
function cuandoEsteLibre(hacer: () => void): () => void {
  let id: number | undefined;
  const programar = () => {
    if (typeof window.requestIdleCallback === "function")
      id = window.requestIdleCallback(hacer, { timeout: 3000 });
    else id = window.setTimeout(hacer, 200);
  };
  if (document.readyState === "complete") programar();
  else window.addEventListener("load", programar, { once: true });
  return () => {
    window.removeEventListener("load", programar);
    if (id === undefined) return;
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id);
    window.clearTimeout(id);
  };
}

/**
 * La cinta de cartas de la portada: corre sin parar de derecha a izquierda,
 * se detiene con el cursor o el foco encima y con su boton, y queda quieta
 * (y deslizable) con «reducir movimiento». Llega con un grupo fijo en el
 * HTML y, si la Comunidad tiene barajas publicas suficientes, lo cambia por
 * las cartas mas usadas (`src/lib/destacadas.ts`).
 *
 * El bucle es la lista dos veces: al llegar a la mitad vuelve al comienzo y
 * no se nota. La segunda copia es solo imagen (`inert`): ni el teclado ni un
 * lector de pantalla la recorren.
 */
export function CintaCartas({ fijas }: { fijas: CartaCinta[] }) {
  const [cartas, setCartas] = useState(fijas);
  const [deLaComunidad, setDeLaComunidad] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pausada, setPausada] = useState(false);
  // Las imagenes se piden tras la carga: antes le quitaban ancho de banda al
  // JavaScript y Lighthouse en movil bajaba de 97 a 96 (LCP +0,2 s). Mientras,
  // cada carta es su hueco que late.
  const [conImagenes, setConImagenes] = useState(false);

  useEffect(() => {
    const mostrar = () => setConImagenes(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(mostrar, 0);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", mostrar, { once: true });
    return () => window.removeEventListener("load", mostrar);
  }, []);

  useEffect(() => {
    if (!NUBE_ACTIVA) return;
    let vivo = true;
    let espera: number | undefined;
    const cancelar = cuandoEsteLibre(async () => {
      const elegidas = await pedirDestacadas();
      if (!vivo || !elegidas) return;
      const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setVisible(false);
      espera = window.setTimeout(
        () => {
          setCartas(elegidas);
          setDeLaComunidad(true);
          setVisible(true);
        },
        quieto ? 0 : FUNDIDO_MS,
      );
    });
    return () => {
      vivo = false;
      cancelar();
      window.clearTimeout(espera);
    };
  }, []);

  const lista = (copia: boolean) => (
    <ul
      className={cn("flex shrink-0", copia && "motion-reduce:hidden")}
      // La copia del bucle: solo imagen.
      aria-hidden={copia || undefined}
      inert={copia}
    >
      {cartas.map((c) => (
        <li key={c.imagen} className="shrink-0 pr-4">
          <Link
            href={`/catalogo?q=${encodeURIComponent(c.nombre)}`}
            prefetch={false}
            className={cn(
              "rounded-card border-line bg-panel block overflow-hidden border shadow-lg",
              CONTORNO_CARTA,
            )}
          >
            <span className="sr-only">Ver en el catálogo: </span>
            {/* <img> y no next/image, como en CardTile: con `unoptimized`
                pisa el srcSet. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={conImagenes ? c.thumb : undefined}
              srcSet={conImagenes ? `${c.thumb} 200w, ${c.imagen} 420w` : undefined}
              sizes="(min-width: 768px) 150px, 112px"
              alt={c.nombre}
              loading="lazy"
              decoding="async"
              // Mientras baja, su hueco late (`.imagen-carga`). No se importa
              // `marcarCargada` de CardTile: arrastraria el componente.
              onLoad={(e) => {
                e.currentTarget.dataset.cargada = "";
              }}
              ref={(el) => {
                if (el?.complete && el.naturalWidth) el.dataset.cargada = "";
              }}
              style={{ aspectRatio: CARD_RATIO }}
              // Sin `src`, el navegador pintaria el `alt` como texto.
              className="imagen-carga block w-28 text-transparent md:w-[150px]"
            />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="Cartas destacadas"
      className="cinta w-full"
      data-pausada={pausada}
    >
      <div className="cinta-marco overflow-hidden py-3 motion-reduce:overflow-x-auto">
        <div
          className={cn(
            "cinta-pista flex w-max transition-opacity duration-300",
            !visible && "opacity-0",
          )}
          // `as`: una variable CSS no esta en el tipo de `style`, y el valor
          // es un string de duracion valido.
          style={
            {
              "--cinta-duracion": `${cartas.length * SEGUNDOS_POR_CARTA}s`,
            } as CSSProperties
          }
        >
          {lista(false)}
          {lista(true)}
        </div>
      </div>
      <div className="mx-auto mt-1 flex min-h-9 max-w-[1040px] items-center justify-between gap-4 px-6">
        <p className="text-muted text-sm">
          {deLaComunidad ? "Las más usadas en la Comunidad" : ""}
        </p>
        <button
          type="button"
          onClick={() => setPausada((p) => !p)}
          aria-label={
            pausada ? "Reanudar la cinta de cartas" : "Pausar la cinta de cartas"
          }
          className={cn(BOTON_ICONO_COMPACTO, "shrink-0 motion-reduce:hidden")}
        >
          {pausada ? (
            <Play size={15} aria-hidden="true" />
          ) : (
            <Pause size={15} aria-hidden="true" />
          )}
        </button>
      </div>
    </section>
  );
}
