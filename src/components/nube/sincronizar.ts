import {
  readColeccionActualizado,
  getColeccionSnapshot,
  saveColeccion,
} from "@/lib/coleccion";
import { readDecks, readLapidas, saveDecks, saveLapidas } from "@/lib/deck-storage";
import {
  coleccionComoDatos,
  fusionarBarajas,
  fusionarColecciones,
  leerColeccionRemota,
  leerFilas,
} from "@/lib/sync";
import { toast } from "../toast";
import { api } from "./api";
import {
  conSesion,
  escribiendoDesdeLaNube,
  getEstado,
  guardarRecuerdo,
  leerRecuerdo,
  token,
} from "./nube";

/**
 * Una vuelta de sincronizacion: baja lo de la cuenta, lo junta con lo del
 * navegador (`src/lib/sync.ts`, donde estan las reglas y sus tests) y escribe
 * en cada lado lo que le falta. Se carga solo al usarse (`nube.ts`).
 *
 * Son cuatro peticiones como mucho: leer barajas, escribir barajas, leer y
 * escribir la coleccion. Lo que va y viene son ids de cartas y copias.
 */

const COLUMNAS =
  "id,datos,actualizado,borrada,publica,public_id,oculta,likes,copias,afinidad";

export async function sincronizarAhora(): Promise<void> {
  const inicio = getEstado();
  if (inicio.fase !== "con-sesion") return;
  const uid = inicio.usuario.id;
  const recuerdo = leerRecuerdo();
  const primeraVez = recuerdo?.uid !== uid;
  const ahora = Date.now();
  const t = await token();

  // --- Barajas ---
  const { remotas, publicas } = leerFilas(
    await api(`barajas?select=${COLUMNAS}&user_id=eq.${uid}`, { token: t }),
  );
  const lapidas = readLapidas();
  const plan = fusionarBarajas(readDecks(), remotas, lapidas, ahora);

  const filas = [
    ...plan.subir.map((d) => ({
      user_id: uid,
      id: d.id,
      datos: d,
      actualizado: d.actualizado,
      borrada: false,
    })),
    ...plan.borrar.map((l) => ({
      user_id: uid,
      id: l.id,
      datos: null,
      actualizado: l.borrada,
      borrada: true,
    })),
  ];
  if (filas.length > 0) {
    await api("barajas?on_conflict=user_id,id", {
      metodo: "POST",
      cuerpo: filas,
      prefer: "resolution=merge-duplicates,return=minimal",
      token: t,
    });
  }
  if (plan.cambioLocal) escribiendoDesdeLaNube(() => saveDecks(plan.locales));
  // Lo borrado ya viajo (o la nube ya no lo tenia): las lapidas sobran.
  if (lapidas.length > 0) saveLapidas([]);
  for (const l of plan.borrar) delete publicas[l.id];

  // --- Coleccion ---
  const filasCol = await api(`colecciones?select=datos,actualizado&user_id=eq.${uid}`, {
    token: t,
  });
  const fila: unknown = Array.isArray(filasCol) ? filasCol[0] : undefined;
  const remotaCol =
    typeof fila === "object" && fila !== null && "datos" in fila && "actualizado" in fila
      ? leerColeccionRemota(fila.datos, fila.actualizado)
      : null;
  const planCol = fusionarColecciones(
    { coleccion: getColeccionSnapshot(), actualizado: readColeccionActualizado() },
    remotaCol,
    primeraVez,
    ahora,
  );
  if (planCol.subir) {
    await api("colecciones?on_conflict=user_id", {
      metodo: "POST",
      cuerpo: {
        user_id: uid,
        datos: coleccionComoDatos(planCol.subir.coleccion),
        actualizado: planCol.subir.actualizado,
      },
      prefer: "resolution=merge-duplicates,return=minimal",
      token: t,
    });
  }
  const local = planCol.local;
  if (local)
    escribiendoDesdeLaNube(() => saveColeccion(local.coleccion, local.actualizado));

  // --- Listo ---
  const fin = getEstado();
  if (fin.fase !== "con-sesion" || fin.usuario.id !== uid) return; // salio a medias
  const ultima = Date.now();
  guardarRecuerdo({ uid, ultima, alias: fin.alias, publicas });
  conSesion({ ultima, publicas, error: null });

  if (primeraVez && plan.traidas > 0) {
    toast(
      plan.traidas === 1
        ? "Se trajo 1 baraja de tu cuenta."
        : `Se trajeron ${plan.traidas} barajas de tu cuenta.`,
      "success",
    );
  }
  // Solo la primera vez: despues seria el mismo aviso en cada guardado.
  if (primeraVez && plan.noCupieron > 0) {
    toast(
      `${plan.noCupieron} ${plan.noCupieron === 1 ? "baraja de tu cuenta no cupo" : "barajas de tu cuenta no cupieron"} en este navegador: ya hay 50. Siguen guardadas en la cuenta.`,
      "warning",
    );
  }
}
