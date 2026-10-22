"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, Heart, Search, Users } from "lucide-react";

import { marcarCargada } from "../CardTile";
import { Pagination } from "../Pagination";
import { Select } from "../Select";
import { DeckListSkeleton } from "../Skeleton";
import { useCatalogo } from "../use-catalogo";
import { mensajeDeError } from "./api";
import { listarPublicas } from "./comunidad-api";
import { useNube } from "./nube";
import {
  AFINIDADES,
  esAfinidad,
  esOrdenComunidad,
  ETIQUETA_ORDEN_COMUNIDAD,
  etiquetaAfinidad,
  ORDENES_COMUNIDAD,
  POR_PAGINA,
  type FilaPublica,
  type OrdenComunidad,
} from "@/lib/comunidad";
import { pageRange } from "@/lib/catalog";
import { irArriba } from "@/lib/scroll";
import { NUBE_ACTIVA } from "@/lib/supabase-config";
import {
  ENLACE,
  SEGMENTO,
  SEGMENTO_ACTIVO,
  SEGMENTO_INACTIVO,
  SEGMENTOS,
  TEXT_FIELD,
  VACIO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

const FECHA = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });

interface Consulta {
  orden: OrdenComunidad;
  afinidad: string;
  q: string;
  pagina: number;
}

const INICIAL: Consulta = { orden: "likes", afinidad: "", q: "", pagina: 1 };

/** La consulta desde la URL, validando cada valor: la URL es entrada de afuera. */
function leerUrl(search: string): Consulta {
  const p = new URLSearchParams(search);
  const orden = p.get("orden");
  const afinidad = p.get("afinidad");
  const pagina = Number(p.get("pagina"));
  return {
    orden: esOrdenComunidad(orden) ? orden : "likes",
    afinidad: esAfinidad(afinidad) ? afinidad : "",
    q: (p.get("q") ?? "").slice(0, 60),
    pagina: Number.isInteger(pagina) && pagina > 1 && pagina < 10_000 ? pagina : 1,
  };
}

function escribirUrl(c: Consulta): string {
  const p = new URLSearchParams();
  if (c.orden !== "likes") p.set("orden", c.orden);
  if (c.afinidad) p.set("afinidad", c.afinidad);
  if (c.q.trim()) p.set("q", c.q.trim());
  if (c.pagina > 1) p.set("pagina", String(c.pagina));
  const s = p.toString();
  return s ? `?${s}` : "";
}

type Resultado =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "ok"; filas: FilaPublica[]; total: number };

/**
 * `/comunidad`: las barajas publicas, ordenadas por likes, tendencia (likes
 * de los ultimos 7 dias), recientes o copias, con filtro por afinidad y
 * buscador por nombre. Orden y filtros van en la URL, como en el catalogo.
 *
 * Se ve sin cuenta. La lista la arma la base (`listar_publicas`), de a
 * `POR_PAGINA`; el catalogo solo hace falta para la portada de cada una.
 */
export function ComunidadView() {
  const nube = useNube();
  const catalogo = useCatalogo();
  const porId = useMemo(
    () => new Map((catalogo.cards ?? []).map((c) => [c.id, c])),
    [catalogo.cards],
  );

  const [consulta, setConsulta] = useState<Consulta>(INICIAL);
  const [leidaUrl, setLeidaUrl] = useState(false);
  /** Lo tecleado en el buscador; la consulta lo toma tras una pausa. */
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<{ clave: string; r: Resultado } | null>(
    null,
  );

  useEffect(() => {
    const c = leerUrl(window.location.search);
    // Sincroniza con un sistema externo (la URL) una sola vez, al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsulta(c);
    setTexto(c.q);
    setLeidaUrl(true);
  }, []);

  useEffect(() => {
    if (!leidaUrl) return;
    history.replaceState(
      history.state,
      "",
      `${window.location.pathname}${escribirUrl(consulta)}`,
    );
  }, [leidaUrl, consulta]);

  // El buscador espera a que se deje de teclear: una peticion por palabra, no
  // por letra.
  useEffect(() => {
    if (!leidaUrl || texto === consulta.q) return;
    const t = setTimeout(() => setConsulta((c) => ({ ...c, q: texto, pagina: 1 })), 350);
    return () => clearTimeout(t);
  }, [texto, consulta.q, leidaUrl]);

  // `me_gusta` y compania no se piden aqui, pero se vuelve a pedir al entrar
  // o salir por si cambio que barajas se ven (las propias, por ejemplo).
  const quien = nube.fase === "con-sesion" ? nube.usuario.id : nube.fase;
  const clave = JSON.stringify([consulta, quien]);

  useEffect(() => {
    if (!leidaUrl || !NUBE_ACTIVA) return;
    let vigente = true;
    listarPublicas(
      consulta.orden,
      consulta.afinidad || null,
      consulta.q,
      consulta.pagina,
    ).then(
      ({ filas, total }) =>
        vigente && setResultado({ clave, r: { fase: "ok", filas, total } }),
      (e: unknown) =>
        vigente &&
        setResultado({ clave, r: { fase: "error", mensaje: mensajeDeError(e) } }),
    );
    return () => {
      vigente = false;
    };
  }, [leidaUrl, consulta, clave]);

  if (!NUBE_ACTIVA) {
    return (
      <p className="text-muted mt-8 leading-relaxed">
        La Comunidad todavía no está disponible.
      </p>
    );
  }

  const r: Resultado = resultado?.clave === clave ? resultado.r : { fase: "cargando" };
  const cambiar = (cambios: Partial<Consulta>) =>
    setConsulta((c) => ({ ...c, pagina: 1, ...cambios }));
  const totalPaginas = r.fase === "ok" ? Math.max(1, Math.ceil(r.total / POR_PAGINA)) : 1;

  return (
    <div className="mt-8 flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Buscar por nombre</span>
          <Search
            size={16}
            aria-hidden="true"
            className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={60}
            placeholder="Nombre de la baraja…"
            className={cn(TEXT_FIELD, "pl-9")}
          />
        </label>
        <div className="w-full sm:w-64">
          <Select
            label="Afinidad"
            value={consulta.afinidad}
            options={[...AFINIDADES]}
            onChange={(v) => cambiar({ afinidad: v })}
            placeholder="Todas"
            format={etiquetaAfinidad}
          />
        </div>
      </div>

      <div role="group" aria-label="Ordenar" className={cn(SEGMENTOS, "self-start")}>
        {ORDENES_COMUNIDAD.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={consulta.orden === o}
            onClick={() => cambiar({ orden: o })}
            className={cn(
              SEGMENTO,
              consulta.orden === o ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO,
            )}
          >
            {ETIQUETA_ORDEN_COMUNIDAD[o]}
          </button>
        ))}
      </div>

      {r.fase === "cargando" && (
        <div aria-busy="true">
          <span className="sr-only">Cargando barajas…</span>
          <DeckListSkeleton />
        </div>
      )}

      {r.fase === "error" && (
        <div className={VACIO} role="alert">
          <p className="text-ink text-lg">No se pudo cargar la Comunidad.</p>
          <p className="text-muted mt-2">{r.mensaje}</p>
        </div>
      )}

      {r.fase === "ok" && r.filas.length === 0 && (
        <div className={VACIO}>
          <Users
            size={28}
            aria-hidden="true"
            className="text-muted mx-auto mb-4 opacity-60"
          />
          <p className="text-ink text-lg">
            {consulta.q || consulta.afinidad
              ? "No hay barajas que coincidan con tu búsqueda."
              : "Todavía no hay barajas públicas."}
          </p>
          <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
            Puedes publicar una desde{" "}
            <Link href="/barajas" className={ENLACE}>
              Mis barajas
            </Link>
            .
          </p>
        </div>
      )}

      {r.fase === "ok" && r.filas.length > 0 && (
        <>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {r.filas.map((f) => {
              const portada = f.portada ? porId.get(f.portada) : undefined;
              return (
                <li
                  key={f.public_id}
                  className="aparece border-line bg-panel rounded-panel ease-out-soft hover:outline-brand-500 group relative flex cursor-pointer gap-3 border p-3.5 transition duration-200 focus-within:-translate-y-0.5 hover:-translate-y-0.5 hover:outline-2 hover:outline-offset-2"
                >
                  {portada ? (
                    <Image
                      src={portada.thumb}
                      alt=""
                      width={64}
                      height={92}
                      loading="lazy"
                      onLoad={marcarCargada}
                      className="imagen-carga border-line h-[92px] w-[64px] shrink-0 self-start rounded border object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="border-line bg-surface h-[92px] w-[64px] shrink-0 rounded border"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/baraja/?p=${f.public_id}`}
                      className="text-ink focus-visible:outline-brand-500 rounded-panel group-hover:text-accent block truncate font-medium transition-colors after:absolute after:inset-0 after:content-['']"
                    >
                      {f.nombre || "Sin nombre"}
                    </Link>
                    <p className="truncate text-[13px]">
                      por <span className="text-accent">{f.alias}</span>
                    </p>
                    <p className="text-muted truncate text-[13px]">
                      {etiquetaAfinidad(f.afinidad)} · {FECHA.format(f.publicada_en)}
                    </p>
                    <p className="text-muted mt-auto flex gap-3 text-[13px] tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Heart size={13} aria-hidden="true" />
                        {f.likes}
                        <span className="sr-only">likes</span>
                      </span>
                      {consulta.orden === "tendencia" && (
                        <span>+{f.likes_semana} esta semana</span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Copy size={13} aria-hidden="true" />
                        {f.copias}
                        <span className="sr-only">copias guardadas</span>
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={consulta.pagina}
            total={totalPaginas}
            range={pageRange(consulta.pagina, r.total, POR_PAGINA)}
            results={r.total}
            unidad={r.total === 1 ? "baraja" : "barajas"}
            onChange={(pagina) => {
              setConsulta((c) => ({ ...c, pagina }));
              irArriba();
            }}
          />
        </>
      )}
    </div>
  );
}
