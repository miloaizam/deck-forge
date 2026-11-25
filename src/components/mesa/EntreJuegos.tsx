"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as z from "zod/mini";
import { ArrowLeftRight, Check, Hourglass, LogOut, Timer, Undo2 } from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "../toast";
import { Select } from "../Select";
import {
  abandonarSala,
  guardarPrivado,
  leerPrivado,
  marcarLista,
  mensajeDeSala,
} from "./sala-api";
import { reloj, useAbandono } from "./use-abandono";
import { copiesOf, totalCards } from "@/lib/deck";
import { indiceDe, isLegal, validateDeck } from "@/lib/deck-rules";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import type { Lado } from "@/lib/mesa/red";
import {
  GRACIA_MS,
  miLado,
  nombreEnSala,
  restanteDeGracia,
  type Sala,
} from "@/lib/mesa/sala";
import {
  cambiarConSide,
  cambiosConSide,
  numeroDeJuego,
  textoDelUltimo,
  victoriasParaGanar,
} from "@/lib/mesa/serie";
import { deckSchema, type Card, type Deck, type Formato } from "@/lib/types";
import {
  AVISO_EN_LINEA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  BOTON_SECUNDARIO_COMPACTO,
  ENLACE,
  HOVER_PELIGRO,
  PASTILLA,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

const PANEL = "border-line bg-panel rounded-panel border p-5 sm:p-6";

/** Los 2 minutos que el anexo 1 del DAR da para el cambio en torneo. */
const TIEMPO_SIDE_MS = 120_000;
/** Sin senal en este tiempo, el rival se da por ido y corre su cuenta. */
const AUSENTE_MS = 45_000;

const privadoSchema = z.object({
  baraja: deckSchema,
  semilla: z.optional(z.int().check(z.minimum(1), z.maximum(2 ** 31))),
  actual: z.optional(deckSchema),
});

interface Privado {
  baraja: Deck;
  semilla: number;
  actual: Deck;
}

interface EntreJuegosProps {
  sala: Sala;
  uid: string;
  recibida: number;
  deFormato: (f: Formato) => Card[];
  refrescar: () => Promise<void>;
}

/**
 * Entre un juego y el siguiente (GAME.md, sesion 7): el marcador, como
 * termino el ultimo y el cambio con el Mazo de Soporte (DAR, anexo 1), una
 * carta por otra y siempre 50 en el Castillo. Los cambios valen para la
 * serie; la baraja guardada no cambia.
 */
export function EntreJuegos({
  sala,
  uid,
  recibida,
  deFormato,
  refrescar,
}: EntreJuegosProps) {
  const lado: Lado = miLado(sala, uid) ?? "a";
  const rival: Lado = lado === "a" ? "b" : "a";
  const listo = lado === "a" ? sala.listo_a : sala.listo_b;
  const rivalListo = lado === "a" ? sala.listo_b : sala.listo_a;
  const [privado, setPrivado] = useState<Privado | null | "error">(null);
  const [sale, setSale] = useState("");
  const [entra, setEntra] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [cuentaSide, setCuentaSide] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);
  const [abandonando, setAbandonando] = useState(false);

  useEffect(() => {
    let vivo = true;
    leerPrivado(sala.id, uid)
      .then((d) => {
        const r = privadoSchema.safeParse(d);
        if (!vivo) return;
        if (!r.success || !r.data.semilla) {
          setPrivado("error");
          return;
        }
        setPrivado({
          baraja: r.data.baraja,
          semilla: r.data.semilla,
          actual: r.data.actual ?? r.data.baraja,
        });
      })
      .catch(() => vivo && setPrivado("error"));
    return () => {
      vivo = false;
    };
  }, [sala.id, uid]);

  // Los 2 minutos del cambio, si se quieren: solo los ve quien los pidio.
  useEffect(() => {
    if (cuentaSide === null) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cuentaSide]);

  // Sin senal del rival hace rato, corre su cuenta (aqui no hay presencia).
  const desdeSenal = restanteDeGracia(sala, rival, recibida, recibida);
  const ausente = desdeSenal !== null && desdeSenal < GRACIA_MS - AUSENTE_MS;
  const restante = useAbandono(sala.id, sala, rival, recibida, ausente);

  const cards = useMemo(() => deFormato(sala.formato), [deFormato, sala.formato]);
  const nombres = useMemo(() => new Map(cards.map((c) => [c.id, c.nombre])), [cards]);
  const indice = useMemo(() => indiceDe(cards, sala.formato), [cards, sala.formato]);
  const nombre = (id: string) => nombres.get(id) ?? id;

  const actual = privado && privado !== "error" ? privado.actual : null;
  const problema = useMemo(() => {
    if (!actual) return null;
    const issues = validateDeck(actual, indice);
    return isLegal(issues)
      ? null
      : (issues.find((i) => i.gravedad === "error")?.mensaje ?? "No cumple.");
  }, [actual, indice]);

  async function hacer(fn: () => Promise<void>, despues?: string) {
    setOcupado(true);
    try {
      await fn();
      await refrescar();
      if (despues) toast(despues, "success");
    } catch (e) {
      toast(mensajeDeSala(e), "warning");
    } finally {
      setOcupado(false);
    }
  }

  const necesarias = victoriasParaGanar(sala.mejor_de);
  const mias = lado === "a" ? sala.victorias_a : sala.victorias_b;
  const suyas = lado === "a" ? sala.victorias_b : sala.victorias_a;
  const juego = numeroDeJuego(sala);
  const quedaSide = cuentaSide === null ? null : Math.max(0, cuentaSide - ahora);

  let side: ReactNode;
  if (privado === null) {
    side = <p className="text-muted mt-3 text-[14px]">Cargando tu baraja…</p>;
  } else if (privado === "error") {
    side = (
      <p className="text-ink mt-3 text-[14px]">
        No se encontró tu baraja para esta sala.
      </p>
    );
  } else if (privado.actual.side.length === 0) {
    side = (
      <p className="text-muted mt-3 text-[14px]">
        Tu baraja no tiene Mazo de Soporte: juegas con las mismas 50.
      </p>
    );
  } else {
    const p = privado;
    const enCastillo = p.actual.principal.map((e) => e.id);
    const enSide = p.actual.side.map((e) => e.id);
    const { entraron, salieron } = cambiosConSide(p.baraja, p.actual);
    const cambiar = () => {
      const nueva = cambiarConSide(p.actual, sale, entra);
      if (!nueva) return;
      setPrivado({ ...p, actual: nueva });
      setSale("");
      setEntra("");
    };
    side = (
      <>
        <p className="text-muted mt-1 text-[14px]">
          Una carta por otra, siempre con {totalCards(p.actual.principal)} en el Castillo
          y {totalCards(p.actual.side)} en el Soporte. Tu rival ve la cuenta de tu Soporte
          en la mesa.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select
            label="Sale del Castillo"
            requerido
            placeholder="Elige una carta"
            value={sale}
            options={["", ...enCastillo]}
            onChange={setSale}
            format={nombre}
            detalle={(v) => (v === "" ? null : `×${copiesOf(p.actual, v, "principal")}`)}
            deshabilitada={(v) =>
              v === ""
                ? "Elige una"
                : v === p.actual.oroInicial
                  ? "Es tu oro inicial"
                  : null
            }
            disabled={listo || ocupado}
            className="min-w-56 flex-1"
          />
          <Select
            label="Entra del Soporte"
            requerido
            placeholder="Elige una carta"
            value={entra}
            options={["", ...enSide]}
            onChange={setEntra}
            format={nombre}
            detalle={(v) => (v === "" ? null : `×${copiesOf(p.actual, v, "side")}`)}
            deshabilitada={(v) => (v === "" ? "Elige una" : null)}
            disabled={listo || ocupado}
            className="min-w-56 flex-1"
          />
          <button
            type="button"
            onClick={cambiar}
            disabled={listo || ocupado || !cambiarConSide(p.actual, sale, entra)}
            className={BOTON_SECUNDARIO}
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
            Cambiar
          </button>
        </div>
        {entraron.length > 0 && (
          <div className="mt-4 text-[14px]">
            <p className="text-ink">
              <span className="text-success font-medium">Entran:</span>{" "}
              {entraron.map((e) => `${e.n}× ${nombre(e.id)}`).join(", ")}
            </p>
            <p className="text-ink mt-1">
              <span className="text-danger font-medium">Salen:</span>{" "}
              {salieron.map((e) => `${e.n}× ${nombre(e.id)}`).join(", ")}
            </p>
            <button
              type="button"
              onClick={() => setPrivado({ ...p, actual: p.baraja })}
              disabled={listo || ocupado}
              className={cn(BOTON_SECUNDARIO_COMPACTO, "mt-3")}
            >
              <Undo2 size={14} aria-hidden="true" />
              Volver a la baraja guardada
            </button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAhora(Date.now());
              setCuentaSide(Date.now() + TIEMPO_SIDE_MS);
            }}
            disabled={listo}
            className={BOTON_SECUNDARIO_COMPACTO}
          >
            <Timer size={14} aria-hidden="true" />
            {cuentaSide === null ? "Contar 2 minutos" : "Volver a contar"}
          </button>
          {quedaSide !== null && (
            <span className="text-muted text-[14px] tabular-nums">
              {quedaSide > 0
                ? `Quedan ${reloj(quedaSide)} para el cambio.`
                : "Se acabaron los 2 minutos."}
            </span>
          )}
        </div>
      </>
    );
  }

  return (
    <section
      aria-labelledby="sala-titulo"
      className="mx-auto flex max-w-3xl flex-col gap-5"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/mesa/"
            title="La sala queda abierta: si no vuelves en 2 minutos, la serie es de tu rival."
            className={cn(ENLACE, "text-[14px]")}
          >
            ← Salir por ahora
          </Link>
          <button
            type="button"
            onClick={() => setAbandonando(true)}
            disabled={ocupado}
            className={cn(BOTON_SECUNDARIO_COMPACTO, HOVER_PELIGRO)}
          >
            <LogOut size={14} aria-hidden="true" />
            Abandonar la serie
          </button>
        </div>
        <ConfirmDialog
          open={abandonando}
          titulo="¿Abandonar la serie?"
          mensaje={`La serie es para ${nombreEnSala(sala, rival)} y la sala se cierra para los dos.`}
          confirmar="Abandonar la serie"
          onCancel={() => setAbandonando(false)}
          onConfirm={() => {
            setAbandonando(false);
            void hacer(() => abandonarSala(sala.id));
          }}
        />
        <p className="text-muted mt-1 text-[14px]">
          Sala <span className="font-mono tracking-[0.15em]">{sala.codigo}</span> ·{" "}
          {NOMBRE_FORMATO[sala.formato]} · al mejor de {sala.mejor_de}: gana quien llegue
          a {necesarias}
        </p>
        <h1 id="sala-titulo" className="text-ink mt-1 text-2xl font-bold tabular-nums">
          Tú {mias} – {suyas} {nombreEnSala(sala, rival)}
        </h1>
        <p className="text-ink mt-2 text-[15px]">{textoDelUltimo(sala, lado)}</p>
      </div>

      {restante !== null && (
        <p
          role="status"
          className={cn(
            AVISO_EN_LINEA,
            "border-warning/60 bg-warning-soft text-ink items-center",
          )}
        >
          <Hourglass size={16} aria-hidden="true" className="text-warning" />
          {restante > 0
            ? `${nombreEnSala(sala, rival)} se desconectó. Si no vuelve en ${reloj(restante)}, la serie es tuya.`
            : `${nombreEnSala(sala, rival)} no volvió: la serie es tuya.`}
        </p>
      )}

      {/* Por encima del panel de abajo: sus desplegables caen sobre el. */}
      <div className={cn(PANEL, "relative z-10")}>
        <h2 className="text-ink text-lg font-bold">Cambios con el Mazo de Soporte</h2>
        {side}
      </div>

      <div className={cn(PANEL, "flex flex-wrap items-center justify-between gap-3")}>
        <div className="text-[14px]">
          <p className="text-ink">
            {listo
              ? `Listo para el juego ${juego}. Esperando a ${nombreEnSala(sala, rival)}.`
              : `Cuando termines los cambios, márcate listo para el juego ${juego}.`}
          </p>
          <p className="mt-1">
            <span className={cn(PASTILLA, rivalListo ? "text-success" : "text-muted")}>
              {rivalListo ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Hourglass size={12} aria-hidden="true" />
              )}
              {nombreEnSala(sala, rival)}: {rivalListo ? "listo" : "haciendo sus cambios"}
            </span>
          </p>
          {problema && !listo && <p className="text-danger mt-2">{problema}</p>}
        </div>
        {listo ? (
          <button
            type="button"
            onClick={() => hacer(() => marcarLista(sala.id, false))}
            disabled={ocupado}
            className={BOTON_SECUNDARIO}
          >
            <Undo2 size={14} aria-hidden="true" />
            Hacer más cambios
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              privado &&
              privado !== "error" &&
              hacer(async () => {
                await guardarPrivado(sala.id, uid, privado);
                await marcarLista(sala.id, true);
              })
            }
            disabled={ocupado || !privado || privado === "error" || problema !== null}
            className={BOTON_PRIMARIO}
          >
            <Check size={16} aria-hidden="true" />
            Listo para el juego {juego}
          </button>
        )}
      </div>
    </section>
  );
}
