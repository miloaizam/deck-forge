"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag, Heart } from "lucide-react";

import { toast } from "../toast";
import { mensajeDeError } from "./api";
import { darLike, leerPublica } from "./comunidad-api";
import { useNube } from "./nube";
import { ReportarDialog } from "./ReportarDialog";
import { ID_PUBLICO, type BarajaPublica } from "@/lib/comunidad";
import { BOTON_ICONO, BOTON_SECUNDARIO, HOVER_AVISO } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type EstadoPublica =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "ok"; baraja: BarajaPublica };

/**
 * Una baraja publica, por su `public_id` (`/baraja/?p=`). Se vuelve a pedir
 * al entrar o salir de la cuenta, porque `mia` y `me_gusta` dependen de quien
 * pregunta.
 */
export function usePublica(pid: string | null): EstadoPublica | null {
  const nube = useNube();
  const quien = nube.fase === "con-sesion" ? nube.usuario.id : nube.fase;
  const clave = `${pid}|${quien}`;
  const [leida, setLeida] = useState<{ clave: string; estado: EstadoPublica } | null>(
    null,
  );

  useEffect(() => {
    if (!pid || quien === "cargando") return;
    let vigente = true;
    const fijar = (estado: EstadoPublica) => {
      if (vigente) setLeida({ clave, estado });
    };
    if (!ID_PUBLICO.test(pid)) {
      // Un enlace mal copiado: se dice sin preguntarle a la nube.
      void Promise.resolve().then(() =>
        fijar({ fase: "error", mensaje: "Este enlace no es de una baraja pública." }),
      );
    } else {
      leerPublica(pid).then(
        (baraja) =>
          fijar(
            baraja
              ? { fase: "ok", baraja }
              : {
                  fase: "error",
                  mensaje: "Esta baraja ya no está publicada.",
                },
          ),
        (e: unknown) => fijar({ fase: "error", mensaje: mensajeDeError(e) }),
      );
    }
    return () => {
      vigente = false;
    };
  }, [pid, quien, clave]);

  if (!pid) return null;
  return leida?.clave === clave ? leida.estado : { fase: "cargando" };
}

interface PublicaAccionesProps {
  baraja: BarajaPublica;
}

/**
 * Like y Reportar en el detalle de una baraja publica. Sin sesion, el like
 * invita a entrar. En una baraja propia no se ofrecen: no se puede dar like
 * ni reportar lo propio.
 */
export function PublicaAcciones({ baraja }: PublicaAccionesProps) {
  const nube = useNube();
  const [like, setLike] = useState({
    id: baraja.public_id,
    si: baraja.me_gusta,
    n: baraja.likes,
  });
  const [reportando, setReportando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Otra baraja, o la misma vuelta a pedir: manda lo que dice la nube.
  if (like.id !== baraja.public_id) {
    setLike({ id: baraja.public_id, si: baraja.me_gusta, n: baraja.likes });
  }

  if (baraja.mia) {
    return (
      <p className="text-muted inline-flex items-center gap-1.5 text-[13px] tabular-nums">
        <Heart size={14} aria-hidden="true" />
        {like.n} {like.n === 1 ? "like" : "likes"} · Tu baraja
      </p>
    );
  }

  const conSesion = nube.fase === "con-sesion";

  const alternar = () => {
    if (!conSesion || ocupado) return;
    const si = !like.si;
    setOcupado(true);
    // Se ve en el acto; si la nube no lo acepta, vuelve atras.
    setLike({ ...like, si, n: Math.max(0, like.n + (si ? 1 : -1)) });
    darLike(baraja.public_id, si)
      .then(
        (n) => setLike((l) => ({ ...l, n })),
        (e: unknown) => {
          setLike(like);
          toast(`No se pudo guardar el like. ${mensajeDeError(e)}`, "warning");
        },
      )
      .finally(() => setOcupado(false));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {conSesion ? (
        <button
          type="button"
          aria-pressed={like.si}
          onClick={alternar}
          className={cn(
            BOTON_SECUNDARIO,
            like.si && "border-brand-500 text-accent bg-accent-soft",
          )}
        >
          <Heart size={15} aria-hidden="true" className={cn(like.si && "fill-current")} />
          <span className="tabular-nums">{like.n}</span>
          <span className="sr-only">{like.si ? "Quitar el like" : "Dar like"}</span>
        </button>
      ) : (
        <Link
          href="/cuenta"
          title="Inicia sesión para dar like"
          className={BOTON_SECUNDARIO}
        >
          <Heart size={15} aria-hidden="true" />
          <span className="tabular-nums">{like.n}</span>
          <span className="sr-only">likes. Inicia sesión para dar like</span>
        </Link>
      )}
      {conSesion && (
        <button
          type="button"
          onClick={() => setReportando(true)}
          aria-label="Reportar la baraja"
          title="Reportar"
          className={cn(BOTON_ICONO, HOVER_AVISO)}
        >
          <Flag size={16} aria-hidden="true" />
        </button>
      )}
      <ReportarDialog
        open={reportando}
        publicId={baraja.public_id}
        nombre={baraja.datos.nombre}
        onClose={() => setReportando(false)}
      />
    </div>
  );
}
