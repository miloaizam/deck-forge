import {
  NOMBRE_FASE,
  ZONA_CON_ARTICULO,
  FASES,
  type EntradaRegistro,
  type Fase,
  type Zona,
} from "./table";

/** «de el» y «a el» se contraen: «del Castillo», «al Cementerio». */
function de(zona: Zona): string {
  const z = ZONA_CON_ARTICULO[zona];
  return z.startsWith("el ") ? `del ${z.slice(3)}` : `de ${z}`;
}

function a(zona: Zona): string {
  const z = ZONA_CON_ARTICULO[zona];
  return z.startsWith("el ") ? `al ${z.slice(3)}` : `a ${z}`;
}

/** «Kirin», «Kirin y Tomoe», «Kirin, Tomoe y Orochi». */
function lista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

function cartas(n: number): string {
  return n === 1 ? "una carta" : `${n} cartas`;
}

const NOMBRE_CONTADOR: Record<string, string> = {
  honor: "de Honor",
  conquista: "de Conquista",
  alimento: "de Alimento",
  generico: "genérico",
};

/**
 * La frase de una linea del registro, impersonal (DESIGN.md, «Escribir en
 * la interfaz»). `nombreDe` da el nombre de una carta por su id; una carta
 * oculta llega como `null` y se dice «una carta». Con dos jugadores,
 * `jugadorDe` antepone quien lo hizo y nombra al otro cuando hace falta.
 */
export function textoDeEntrada(
  e: EntradaRegistro,
  nombreDe: (cartaId: string) => string,
  jugadorDe?: (id: string) => string,
): string {
  const carta = (i = 0): string => {
    const id = e.cartas[i];
    return id ? nombreDe(id) : "una carta";
  };
  const nombres = e.cartas.map((id) => (id ? nombreDe(id) : "una carta"));
  // El Castillo de otro se nombra con su dueno; el propio, a secas.
  const castillo =
    jugadorDe && e.objetivo && e.objetivo !== e.por
      ? `el Castillo de ${jugadorDe(e.objetivo)}`
      : "el Castillo";
  const delCastillo = castillo.replace(/^el /, "del ");

  let frase: string;
  switch (e.tipo) {
    case "preparar":
      frase = "Preparó la mesa: oro inicial en la Reserva y mano de 8.";
      break;
    case "mover":
      frase =
        e.desde && e.hacia
          ? `Mandó ${carta()} ${de(e.desde)} ${a(e.hacia)}.`
          : `Movió ${carta()}.`;
      break;
    case "voltear":
      frase = `Puso ${carta()} boca ${e.detalle === "abajo" ? "abajo" : "arriba"}.`;
      break;
    case "robar":
      frase = `Robó ${cartas(e.cuantas ?? 1)}.`;
      break;
    case "botar":
      frase = `Botó ${lista(nombres)} ${delCastillo}.`;
      break;
    case "barajar":
      frase = `Barajó ${castillo}.`;
      break;
    case "mulligan":
      frase = `Hizo mulligan: mano de ${e.cuantas}.`;
      break;
    case "agrupar":
      frase = "Agrupó: Ataque a Defensa y Oro Pagado a la Reserva.";
      break;
    case "portar":
      frase = `${carta(1)} porta ${carta(0)}.`;
      break;
    case "ponerDebajo":
      frase = `Puso ${carta(0)} debajo de ${carta(1)}.`;
      break;
    case "contador": {
      const n = e.cuantas ?? 0;
      const tipo = NOMBRE_CONTADOR[e.detalle ?? ""] ?? "";
      frase =
        n >= 0
          ? `Puso ${n === 1 ? "un contador" : `${n} contadores`} ${tipo} en ${carta()}.`
          : `Quitó ${-n === 1 ? "un contador" : `${-n} contadores`} ${tipo} de ${carta()}.`;
      break;
    }
    case "fuerza": {
      const n = e.cuantas ?? 0;
      frase = `${carta()}: ${n > 0 ? `+${n}` : n} a la Fuerza.`;
      break;
    }
    case "nota":
      frase = e.detalle
        ? `Anotó en ${carta()}: «${e.detalle}».`
        : `Borró la nota de ${carta()}.`;
      break;
    case "limpiarTemporales":
      frase = "Limpió los modificadores de Fuerza.";
      break;
    case "mirar":
      frase = `Miró ${e.cuantas === 1 ? "la de arriba" : `las ${e.cuantas} de arriba`} ${delCastillo}.`;
      break;
    case "mostrar":
      frase = `Mostró ${e.cuantas === 1 ? "la de arriba" : `las ${e.cuantas} de arriba`} ${delCastillo}: ${lista(nombres)}.`;
      break;
    case "ordenarTope":
      frase = `Devolvió ${cartas(e.cuantas ?? 0)} arriba ${delCastillo}, en el orden elegido.`;
      break;
    case "cerrarRevelado":
      frase =
        e.detalle === "buscar"
          ? `Dejó de buscar${e.desde === "castillo" ? " y barajó el Castillo" : ""}.`
          : "Dejó las cartas como estaban.";
      break;
    case "abrirBusqueda":
      frase = `Empezó a buscar en ${ZONA_CON_ARTICULO[e.desde ?? "castillo"]}.`;
      break;
    case "buscar": {
      const donde = ZONA_CON_ARTICULO[e.desde ?? "castillo"];
      const baraja = e.desde === "castillo" ? " Barajó el Castillo." : "";
      frase =
        e.detalle === "nada"
          ? `No tomó ninguna carta ${de(e.desde ?? "castillo")}.${baraja}`
          : e.detalle === "mostrar"
            ? `Buscó y mostró ${carta()}.${baraja}`
            : `Buscó ${carta()} en ${donde}.${baraja}`;
      break;
    }
    case "barajarDesdeCementerio":
      frase = `Barajó ${lista(nombres)} desde el Cementerio en ${castillo}.`;
      break;
    case "fase":
      frase = `Fase: ${FASES.includes(e.detalle as Fase) ? NOMBRE_FASE[e.detalle as Fase] : e.detalle}.`; // seguro: includes acaba de comprobar que es una Fase
      break;
    case "pasarTurno":
      frase = `Turno ${e.cuantas}${jugadorDe && e.objetivo ? ` de ${jugadorDe(e.objetivo)}` : ""}.`;
      break;
    case "prioridad":
      frase = `Prioridad para ${jugadorDe && e.objetivo ? jugadorDe(e.objetivo) : "el jugador"}.`;
      break;
    case "sortear":
      frase = `Moneda: ${e.detalle}.${jugadorDe && e.objetivo ? ` Comienza ${jugadorDe(e.objetivo)}.` : ""}`;
      break;
    default:
      frase = "Hizo algo en la mesa.";
  }
  // La primera letra en mayuscula: algunas frases empiezan por el nombre de una carta.
  frase = frase.charAt(0).toUpperCase() + frase.slice(1);
  return jugadorDe ? `${jugadorDe(e.por)}: ${frase}` : frase;
}
