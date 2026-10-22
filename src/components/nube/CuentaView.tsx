"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudCheck, LogOut, RefreshCw, Trash2 } from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { Skeleton } from "../Skeleton";
import { toast } from "../toast";
import { mensajeDeError } from "./api";
import { AliasForm } from "./AliasForm";
import { BotonGoogle } from "./BotonGoogle";
import { borrarCuenta, salir, sincronizar, tomarVuelta, useNube } from "./nube";
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

/**
 * `/cuenta`: entrar con Google y, con sesion, el alias, la sincronizacion,
 * cerrar sesion y borrar la cuenta. Es tambien la pagina a la que vuelve
 * Google, que `nube.ts` reconoce por el `?code=`.
 */
export function CuentaView() {
  const nube = useNube();
  const [borrando, setBorrando] = useState(false);
  const router = useRouter();

  // Quien entro desde el constructor, Mis barajas o la coleccion vuelve ahi.
  useEffect(() => {
    if (nube.fase !== "con-sesion") return;
    const vuelta = tomarVuelta();
    if (vuelta) router.replace(vuelta);
  }, [nube.fase, router]);

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
          <li>
            Lo que ya tengas guardado en este navegador se suma a tu cuenta al entrar.
          </li>
        </ul>
        {nube.error && (
          <p role="alert" className="text-warning text-sm">
            {nube.error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <BotonGoogle />
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
