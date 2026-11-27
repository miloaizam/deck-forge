"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DoorOpen, LogIn, Plus } from "lucide-react";

import { Select } from "../Select";
import { crearSala, mensajeDeSala, misSalas, unirseASala } from "./sala-api";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import {
  esFormato,
  MEJOR_DE,
  NOMBRE_ESTADO_SALA,
  normalizarCodigo,
  type MejorDe,
  type Sala,
} from "@/lib/mesa/sala";
import { FORMATOS, type Formato } from "@/lib/types";
import {
  AVISO_EN_LINEA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  ENLACE,
  TEXT_FIELD,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

const PANEL = "border-line bg-panel rounded-panel flex flex-col gap-4 border p-5 sm:p-6";

/**
 * La entrada de la mesa: crear una sala (formato y mejor de 3 o 5), unirse
 * con un codigo y volver a las salas abiertas.
 */
export function LobbyMesa({ codigoInicial }: { codigoInicial: string | null }) {
  const router = useRouter();
  const [formato, setFormato] = useState<Formato>("estandar");
  const [mejorDe, setMejorDe] = useState<MejorDe>(3);
  const [codigo, setCodigo] = useState(codigoInicial ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salas, setSalas] = useState<Sala[] | null>(null);

  useEffect(() => {
    let vivo = true;
    misSalas()
      .then((l) => vivo && setSalas(l))
      .catch(() => vivo && setSalas([]));
    return () => {
      vivo = false;
    };
  }, []);

  async function crear() {
    setOcupado(true);
    setError(null);
    try {
      const { id } = await crearSala(formato, mejorDe);
      router.push(`/mesa/?s=${id}`);
    } catch (e) {
      setError(mensajeDeSala(e));
      setOcupado(false);
    }
  }

  async function unirse() {
    const limpio = normalizarCodigo(codigo);
    if (!limpio) {
      setError("El código tiene seis letras y números.");
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const id = await unirseASala(limpio);
      router.push(`/mesa/?s=${id}`);
    } catch (e) {
      setError(mensajeDeSala(e));
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="mesa-titulo" className="flex flex-col gap-10">
      {/* La cabecera de las demas paginas (Mis barajas, la Comunidad…). */}
      <div>
        <p className="eyebrow mb-3">Mesa</p>
        <h1 id="mesa-titulo" className="text-3xl font-bold tracking-[-0.02em]">
          Mesa
        </h1>
        <p className="text-muted mt-3 leading-relaxed">
          Prueba tus barajas contra otra cuenta. Crea una sala y comparte su código, o
          únete a la de alguien más. Nada se juega solo: cada uno mueve sus cartas y los
          efectos se conversan.
        </p>
        <Link
          href="/mesa/practica/"
          className={cn(ENLACE, "mt-2 inline-block text-[14px]")}
        >
          O practica en solitario
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className={cn(AVISO_EN_LINEA, "border-warning/60 bg-warning-soft text-ink")}
        >
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className={PANEL}>
          <h2 className="text-ink text-lg font-bold">Crear una sala</h2>
          <Select
            label="Formato"
            requerido
            value={formato}
            options={[...FORMATOS]}
            onChange={(v) => esFormato(v) && setFormato(v)}
            format={(v) => (esFormato(v) ? NOMBRE_FORMATO[v] : v)}
          />
          <Select
            label="Serie"
            requerido
            value={String(mejorDe)}
            options={MEJOR_DE.map(String)}
            onChange={(v) => setMejorDe(v === "5" ? 5 : 3)}
            format={(v) => `Al mejor de ${v}`}
          />
          <button
            type="button"
            onClick={crear}
            disabled={ocupado}
            className={cn(BOTON_PRIMARIO, "mt-auto")}
          >
            <Plus size={16} aria-hidden="true" />
            Crear sala
          </button>
        </div>

        <form
          className={PANEL}
          onSubmit={(e) => {
            e.preventDefault();
            void unirse();
          }}
        >
          <h2 className="text-ink text-lg font-bold">Unirse con un código</h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted text-[13px]">Código de la sala</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              maxLength={12}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABC234"
              className={cn(TEXT_FIELD, "font-mono text-lg tracking-[0.2em] uppercase")}
            />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className={cn(BOTON_SECUNDARIO, "mt-auto")}
          >
            <LogIn size={16} aria-hidden="true" />
            Unirse
          </button>
        </form>

        {/* Tercera columna desde lg; en md, a todo el ancho bajo las dos. */}
        <div className={cn(PANEL, "md:col-span-2 lg:col-span-1")}>
          <h2 className="text-ink text-lg font-bold">Tus salas abiertas</h2>
          {salas === null ? (
            <p className="text-muted text-[14px]">Cargando…</p>
          ) : salas.length === 0 ? (
            <p className="text-muted text-[14px]">No tienes salas abiertas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {salas.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/mesa/?s=${s.id}`}
                    className={cn(
                      BOTON_SECUNDARIO,
                      "h-auto w-full flex-wrap justify-between gap-y-1 py-3",
                    )}
                  >
                    <span className="text-ink flex items-center gap-2 font-mono tracking-[0.15em]">
                      <DoorOpen size={16} aria-hidden="true" className="text-accent" />
                      {s.codigo}
                    </span>
                    <span className="text-muted text-[13px]">
                      {NOMBRE_FORMATO[s.formato]} · al mejor de {s.mejor_de} ·{" "}
                      {NOMBRE_ESTADO_SALA[s.estado]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
