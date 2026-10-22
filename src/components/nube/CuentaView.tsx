"use client";

import Link from "next/link";
import { useState } from "react";
import { CloudCheck, LogOut, RefreshCw, Trash2 } from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { Skeleton } from "../Skeleton";
import { toast } from "../toast";
import { mensajeDeError } from "./api";
import { AliasForm } from "./AliasForm";
import { borrarCuenta, entrar, salir, sincronizar, useNube } from "./nube";
import { BOTON_SECUNDARIO, ENLACE, HOVER_PELIGRO } from "@/lib/ui";
import { cn } from "@/lib/utils";

const TARJETA =
  "border-line bg-panel rounded-panel flex flex-col gap-4 border p-5 sm:p-6";

const FECHA = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** El logotipo de Google, en sus colores: lo exige su guia de marca. */
function LogoGoogle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * `/cuenta`: entrar con Google y, con sesion, el alias, la sincronizacion,
 * cerrar sesion y borrar la cuenta. Es tambien la pagina a la que vuelve
 * Google, que `nube.ts` reconoce por el `?code=`.
 */
export function CuentaView() {
  const nube = useNube();
  const [borrando, setBorrando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);

  if (nube.fase === "apagada") {
    return (
      <p className="text-muted mt-8 leading-relaxed">
        Las cuentas todavía no están disponibles. Mientras tanto, todo se guarda en este
        navegador.
      </p>
    );
  }

  if (nube.fase === "cargando") {
    return (
      <div aria-busy="true" className={cn(TARJETA, "mt-8 max-w-2xl")}>
        <span className="sr-only">Cargando la cuenta…</span>
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="rounded-chip h-11 w-48" />
      </div>
    );
  }

  if (nube.fase === "sin-sesion") {
    return (
      <section className={cn(TARJETA, "mt-8 max-w-2xl")}>
        <h2 className="text-lg font-semibold">Guarda tus barajas en la nube</h2>
        <ul className="text-muted list-disc space-y-1.5 pl-5 leading-relaxed">
          <li>Tus barajas y tu colección, en todos tus equipos.</li>
          <li>Publica tus barajas en la Comunidad y dale like a las de otros.</li>
          <li>Sin cuenta, todo sigue funcionando como hasta ahora, en este navegador.</li>
        </ul>
        {nube.error && (
          <p role="alert" className="text-warning text-sm">
            {nube.error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={abriendo}
            onClick={() => {
              setAbriendo(true);
              void entrar().finally(() => setAbriendo(false));
            }}
            className={cn(BOTON_SECUNDARIO, "text-ink bg-surface gap-2.5")}
          >
            <LogoGoogle />
            {abriendo ? "Abriendo Google…" : "Entrar con Google"}
          </button>
        </div>
        <p className="text-muted text-[13px] leading-relaxed">
          Solo se usa tu correo para identificarte; nunca se muestra. Qué se guarda y cómo
          borrarlo:{" "}
          <Link href="/privacidad" className={ENLACE}>
            privacidad
          </Link>
          .
        </p>
      </section>
    );
  }

  const { usuario, alias, sincronizando, ultima, error } = nube;

  return (
    <div className="mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
      <section className={TARJETA}>
        <h2 className="text-lg font-semibold">Tu cuenta</h2>
        <dl className="grid gap-1 text-sm">
          {usuario.nombre && (
            <>
              <dt className="text-muted text-[12px]">Nombre (no se muestra)</dt>
              <dd className="mb-2">{usuario.nombre}</dd>
            </>
          )}
          <dt className="text-muted text-[12px]">Correo (no se muestra)</dt>
          <dd className="break-all">{usuario.email ?? "—"}</dd>
        </dl>
        <AliasForm actual={alias} />
      </section>

      <section className={TARJETA}>
        <h2 className="text-lg font-semibold">Sincronización</h2>
        <p
          className="text-muted flex items-start gap-2 text-sm leading-relaxed"
          aria-live="polite"
        >
          <CloudCheck
            size={18}
            aria-hidden="true"
            className="text-success mt-0.5 shrink-0"
          />
          {sincronizando
            ? "Sincronizando…"
            : ultima
              ? `Barajas y colección al día. Última vez: ${FECHA.format(ultima)}.`
              : "Todavía no se ha sincronizado."}
        </p>
        {error && (
          <p role="alert" className="text-warning text-sm">
            {error}
          </p>
        )}
        <p className="text-muted text-[13px] leading-relaxed">
          Se sincroniza sola al entrar, al guardar y al volver a esta pestaña. El borrador
          del constructor no viaja: se queda en este navegador.
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sincronizando}
            onClick={() => void sincronizar()}
            className={BOTON_SECUNDARIO}
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={cn(sincronizando && "animate-spin motion-reduce:animate-none")}
            />
            Sincronizar ahora
          </button>
          <button
            type="button"
            onClick={() => {
              void salir().then(() => toast("Sesión cerrada.", "info"));
            }}
            className={BOTON_SECUNDARIO}
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </section>

      <section className={cn(TARJETA, "md:col-span-2")}>
        <h2 className="text-lg font-semibold">Borrar la cuenta</h2>
        <p className="text-muted text-sm leading-relaxed">
          Borra la cuenta y todo lo que tiene en la nube: tus barajas (también las
          públicas), tu colección, tus likes y tus reportes. Lo guardado en este navegador
          se queda.
        </p>
        <div>
          <button
            type="button"
            onClick={() => setBorrando(true)}
            className={cn(BOTON_SECUNDARIO, HOVER_PELIGRO)}
          >
            <Trash2 size={16} aria-hidden="true" />
            Borrar mi cuenta
          </button>
        </div>
        <p className="text-muted text-[13px]">
          <Link href="/privacidad" className={ENLACE}>
            Privacidad: qué se guarda y quién lo ve
          </Link>
        </p>
      </section>

      <ConfirmDialog
        open={borrando}
        titulo="¿Borrar tu cuenta?"
        mensaje="Se borran la cuenta y todo lo que tiene en la nube. No se puede deshacer. Lo guardado en este navegador se queda."
        confirmar="Borrar mi cuenta"
        onCancel={() => setBorrando(false)}
        onConfirm={() => {
          setBorrando(false);
          borrarCuenta().then(
            () => toast("Cuenta borrada. Lo de este navegador sigue aquí.", "delete"),
            (e: unknown) =>
              toast(`No se pudo borrar la cuenta. ${mensajeDeError(e)}`, "warning"),
          );
        }}
      />
    </div>
  );
}
