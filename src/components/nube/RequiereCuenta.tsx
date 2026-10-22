"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { CircleUser } from "lucide-react";

import { useDecks } from "../decks/use-decks";
import { BotonGoogle } from "./BotonGoogle";
import { useNube } from "./nube";
import { useConCuenta } from "./use-con-cuenta";
import { estaVacia, getColeccionSnapshot } from "@/lib/coleccion";
import { ENLACE } from "@/lib/ui";

function subscribeHash(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Si el fragmento de la URL empieza con `#<clave>=`: un enlace compartido. */
function useFragmento(clave: string | undefined): boolean {
  return useSyncExternalStore(
    subscribeHash,
    () => clave !== undefined && window.location.hash.startsWith(`#${clave}=`),
    () => false,
  );
}

interface RequiereCuentaProps {
  children: ReactNode;
  /** Lo que se ve mientras se sabe si hay sesion: la silueta de la pagina. */
  esqueleto: ReactNode;
  /** Para que sirve la pagina, en la frase «Entra para …». */
  para: string;
  /**
   * Un enlace compartido no pide cuenta: `"c"` deja pasar `#c=` (una
   * coleccion ajena), `"d"` deja pasar `#d=`.
   */
  libreConFragmento?: string;
  /** Pasa sin cuenta igual (la baraja compartida o publica de /baraja). */
  libre?: boolean;
}

/**
 * Lo personal —el constructor, Mis barajas, la coleccion y el detalle de una
 * baraja propia— pide entrar con Google (decision del proyecto, 22-10-2026).
 * El catalogo, los documentos, la Comunidad y los enlaces compartidos siguen
 * abiertos para cualquiera.
 *
 * Es un candado de interfaz: en un sitio estatico no hay servidor que niegue
 * una pagina, y lo que se guarda vive igual en el navegador. Lo que ya estaba
 * guardado ahi no se pierde: al entrar se suma a la cuenta (`sync.ts`).
 *
 * Con las cuentas apagadas (`NUBE_ACTIVA`) no pide nada. Mientras se sabe si
 * hay sesion se ve la silueta; si hay una guardada, la pagina se muestra de
 * una, sin esperar a que cargue el cliente de autenticacion.
 */
export function RequiereCuenta({
  children,
  esqueleto,
  para,
  libreConFragmento,
  libre = false,
}: RequiereCuentaProps) {
  const nube = useNube();
  const conCuenta = useConCuenta();
  const compartido = useFragmento(libreConFragmento);

  if (libre || compartido || conCuenta) return children;
  if (nube.fase !== "sin-sesion") return esqueleto;
  return <PideCuenta para={para} error={nube.error} />;
}

function PideCuenta({ para, error }: { para: string; error: string | null }) {
  const barajas = useDecks().length;
  const conColeccion = !estaVacia(getColeccionSnapshot());
  const guardado =
    barajas > 0
      ? `${barajas === 1 ? "La baraja guardada" : `Las ${barajas} barajas guardadas`} en este navegador${conColeccion ? " y tu colección" : ""}`
      : conColeccion
        ? "Tu colección guardada en este navegador"
        : null;

  return (
    <section className="border-line bg-panel rounded-panel mx-auto flex max-w-xl flex-col items-center gap-4 border px-6 py-12 text-center">
      <CircleUser size={32} aria-hidden="true" className="text-accent" />
      <h2 className="text-xl font-semibold">Entra para {para}</h2>
      <p className="text-muted leading-relaxed">
        Tus barajas y tu colección se guardan en tu cuenta y te siguen a cualquier equipo.
        Es gratis y se entra con Google.
      </p>
      {guardado && (
        <p className="bg-accent-soft text-ink rounded-card px-4 py-2.5 text-[14px]">
          {guardado} {guardado.startsWith("Las ") ? "se suman" : "se suma"} a tu cuenta al
          entrar: no se pierde nada.
        </p>
      )}
      {error && (
        <p role="alert" className="text-warning text-sm">
          {error}
        </p>
      )}
      <BotonGoogle />
      <p className="text-muted text-[13px] leading-relaxed">
        Sin cuenta puedes ver el{" "}
        <Link href="/catalogo" className={ENLACE}>
          catálogo
        </Link>{" "}
        y la{" "}
        <Link href="/comunidad" className={ENLACE}>
          Comunidad
        </Link>
        . Qué se guarda:{" "}
        <Link href="/privacidad" className={ENLACE}>
          políticas de privacidad
        </Link>
        .
      </p>
    </section>
  );
}
