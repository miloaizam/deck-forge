"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudAlert, CloudCheck, LogOut, RefreshCw, Trash2 } from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { Skeleton } from "../Skeleton";
import { toast } from "../toast";
import { mensajeDeError } from "./api";
import { AliasForm } from "./AliasForm";
import { Avatar } from "./Avatar";
import { BotonGoogle, CrearCuenta } from "./BotonGoogle";
import { FotoControles } from "./FotoControles";
import { borrarCuenta, salir, sincronizar, tomarVuelta, useNube } from "./nube";
import { rutaAvatar } from "@/lib/avatar";
import { BOTON_SECUNDARIO, ENLACE, HOVER_PELIGRO } from "@/lib/ui";
import { cn } from "@/lib/utils";

const TARJETA =
  "border-line bg-panel rounded-panel flex flex-col gap-4 border p-5 sm:p-6";

const HORA = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const DIA = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" });

/** «hoy a las 17:08», «ayer a las 17:08» o «el 22 de octubre a las 17:08». */
function cuandoSincronizo(fecha: number): string {
  const dias = (d: Date) =>
    Math.floor(d.getTime() / 864e5 - d.getTimezoneOffset() / 1440);
  const atras = dias(new Date()) - dias(new Date(fecha));
  const dia = atras === 0 ? "hoy" : atras === 1 ? "ayer" : `el ${DIA.format(fecha)}`;
  return `${dia} a las ${HORA.format(fecha)}`;
}

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
        Las cuentas todavía no están disponibles.
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
        <h2 className="text-lg font-semibold">Inicia sesión</h2>
        <p className="text-muted leading-relaxed">Con tu cuenta puedes:</p>
        <ul className="text-muted -mt-2 list-disc space-y-1 pl-5 leading-relaxed">
          <li>Armar y guardar barajas.</li>
          <li>Llevar tu colección.</li>
          <li>Ver todo desde cualquier equipo.</li>
          <li>Publicar barajas en la Comunidad y dar like.</li>
        </ul>
        {nube.error && (
          <p role="alert" className="text-warning text-sm">
            {nube.error}
          </p>
        )}
        <div className="flex flex-col items-start gap-2">
          <BotonGoogle />
          <CrearCuenta />
        </div>
        <p className="text-muted text-[13px] leading-relaxed">
          Tu correo solo sirve para identificarte y nunca se muestra.{" "}
          <Link href="/privacidad" className={ENLACE}>
            Ver políticas de privacidad
          </Link>
        </p>
      </section>
    );
  }

  const { usuario, alias, avatar, sincronizando, ultima, error } = nube;

  return (
    <div className="mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
      <section
        aria-label="Tus datos"
        className={cn(TARJETA, "sm:flex-row sm:items-center md:col-span-2")}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar ruta={rutaAvatar(usuario.id, avatar)} lado={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">
              {usuario.nombre ?? usuario.email ?? "Tu cuenta"}
            </p>
            {usuario.nombre && usuario.email && (
              <p className="text-muted text-sm break-all">{usuario.email}</p>
            )}
            <p className="text-muted mt-1 text-[13px]">
              Nadie más ve tu nombre ni tu correo.
            </p>
            <div className="mt-3">
              <FotoControles conAlias={alias !== null} conFoto={avatar !== null} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void salir().then(() => toast("Sesión cerrada.", "info"));
          }}
          className={cn(BOTON_SECUNDARIO, "self-start sm:self-center")}
        >
          <LogOut size={16} aria-hidden="true" />
          Cerrar sesión
        </button>
      </section>

      <section className={TARJETA}>
        <h2 className="text-lg font-semibold">Alias</h2>
        <AliasForm actual={alias} etiquetaOculta />
      </section>

      <section className={TARJETA}>
        <h2 className="text-lg font-semibold">Sincronización</h2>
        <div className="flex items-center gap-3" aria-live="polite">
          {sincronizando ? (
            <RefreshCw
              size={22}
              aria-hidden="true"
              className="text-accent shrink-0 animate-spin motion-reduce:animate-none"
            />
          ) : error ? (
            <CloudAlert size={22} aria-hidden="true" className="text-warning shrink-0" />
          ) : (
            <CloudCheck size={22} aria-hidden="true" className="text-success shrink-0" />
          )}
          <p className="text-sm leading-snug">
            {sincronizando ? (
              "Sincronizando…"
            ) : error ? (
              <span role="alert" className="text-warning">
                {error}
              </span>
            ) : ultima ? (
              <>
                <span className="block font-medium">Sincronizado</span>
                <span className="text-muted whitespace-nowrap">
                  {cuandoSincronizo(ultima)}
                </span>
              </>
            ) : (
              "Todavía no se ha sincronizado."
            )}
          </p>
        </div>
        <p className="text-muted text-[13px] leading-relaxed">
          Tus barajas y tu colección se sincronizan solas cada vez que guardas.
        </p>
        <div>
          <button
            type="button"
            disabled={sincronizando}
            onClick={() => void sincronizar()}
            className={BOTON_SECUNDARIO}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Sincronizar ahora
          </button>
        </div>
      </section>

      <section className="border-line rounded-panel flex flex-col gap-3 border border-dashed p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6 md:col-span-2">
        <div className="flex-1">
          <h2 className="font-semibold">Borrar la cuenta</h2>
          <p className="text-muted mt-1 text-[13px] leading-relaxed">
            Se borran tu cuenta, tu foto, tus barajas (también las públicas), tu colección
            y tus likes. No se puede deshacer.{" "}
            <Link href="/privacidad" className={ENLACE}>
              Ver políticas de privacidad
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBorrando(true)}
          className={cn(BOTON_SECUNDARIO, HOVER_PELIGRO, "self-start sm:self-center")}
        >
          <Trash2 size={16} aria-hidden="true" />
          Borrar mi cuenta
        </button>
      </section>

      <ConfirmDialog
        open={borrando}
        titulo="¿Borrar tu cuenta?"
        mensaje="Se borrarán tu cuenta, tu foto, tus barajas, tu colección y tus likes. No se puede deshacer."
        confirmar="Borrar mi cuenta"
        onCancel={() => setBorrando(false)}
        onConfirm={() => {
          setBorrando(false);
          borrarCuenta().then(
            () => toast("Cuenta borrada.", "delete"),
            (e: unknown) =>
              toast(`No se pudo borrar la cuenta. ${mensajeDeError(e)}`, "warning"),
          );
        }}
      />
    </div>
  );
}
