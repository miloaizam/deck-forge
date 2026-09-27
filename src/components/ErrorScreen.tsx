import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "./ThemeToggle";

/**
 * Lo que dice cada codigo. La pantalla es la misma para todos: solo cambia el
 * numero y el texto, asi que agregar un codigo es agregar una entrada aqui.
 *
 * En un sitio estatico solo pueden ocurrir dos: 404 (la ruta no existe, la
 * sirve Cloudflare desde out/404.html) y 500 (algo reviento en el navegador,
 * lo atrapan error.tsx y global-error.tsx). No hay servidor que devuelva un
 * 403 o un 503.
 */
const ERRORES = {
  404: {
    titulo: "Esta página no existe",
    mensaje:
      "La dirección que abriste no lleva a ninguna parte. Puede que el enlace esté mal escrito o que la página se haya movido.",
  },
  500: {
    titulo: "Algo falló al cargar esta página",
    mensaje:
      "Es un error nuestro, no tuyo. Tus barajas siguen guardadas en este navegador. Prueba de nuevo y, si se repite, vuelve al inicio.",
  },
} as const;

export type ErrorCode = keyof typeof ERRORES;

interface ErrorScreenProps {
  code: ErrorCode;
  /** Las salidas que se ofrecen: enlaces o botones, el principal primero. */
  children: ReactNode;
}

/**
 * Pantalla de error con el aire de la portada: sin navbar, fondo de forja y el
 * codigo en grande. Sin "use client" a proposito: la usan tanto not-found.tsx
 * (Server Component) como error.tsx (que tiene que ser de cliente).
 */
export function ErrorScreen({ code, children }: ErrorScreenProps) {
  const { titulo, mensaje } = ERRORES[code];

  return (
    <main className="bg-forge relative flex flex-1 items-center justify-center overflow-hidden px-6 py-20">
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      <div
        aria-hidden="true"
        className="bg-halo pointer-events-none absolute top-[-16rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[130px]"
      />

      <div className="relative w-full max-w-[1040px] text-center">
        {/* Sin navbar, el logotipo es la salida a casa que el usuario espera
            encontrar arriba. Cada tema monta su version, como en la navbar. */}
        <Link
          href="/"
          className="focus-visible:outline-brand-500 mb-12 inline-block rounded"
        >
          <Image
            src="/brand/logo-white.svg"
            alt="DeckForge"
            width={152}
            height={44}
            priority
            className="solo-oscuro h-10 w-auto"
          />
          <Image
            src="/brand/logo-violet.svg"
            alt="DeckForge"
            width={152}
            height={44}
            priority
            className="solo-claro h-10 w-auto"
          />
        </Link>

        {/* El numero es decoracion: el lector de pantalla ya lo oye en el
            eyebrow, y leido dos veces seguidas solo estorba. */}
        <p
          aria-hidden="true"
          className="text-wordmark text-[clamp(6rem,24vw,11rem)] leading-none font-bold tracking-[-0.04em] tabular-nums"
        >
          {code}
        </p>

        <p className="eyebrow mt-8 mb-4">Error {code}</p>

        <h1 className="text-[clamp(1.75rem,4.5vw,2.5rem)] leading-tight font-bold tracking-[-0.02em]">
          {titulo}
        </h1>

        <p className="text-muted mx-auto mt-5 max-w-[54ch] text-[17px] leading-relaxed">
          {mensaje}
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </main>
  );
}
