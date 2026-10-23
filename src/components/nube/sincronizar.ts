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
  limpiarNavegador,
  token,
} from "./nube";

/** Cuantas barajas no subieron por el tope la ultima vez que se aviso. */
let avisadasSinSubir = 0;

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
  // Lo que quedo en el navegador es de OTRA cuenta (cerro sesion sin poder
  // subirlo): no se hereda. Sin recuerdo, es de antes de tener cuenta y se suma.
  if (recuerdo && recuerdo.uid !== uid) {
    limpiarNavegador();
    guardarRecuerdo(null);
  }
  const primeraVez = recuerdo?.uid !== uid;
  const ahora = Date.now();
  const t = await token();

  // --- Barajas ---
  const { remotas, publicas } = leerFilas(
    await api(`barajas?select=${COLUMNAS}&user_id=eq.${uid}`, { token: t }),
  );
  // Lo que habia al empezar. Lo que se guarde o borre mientras viajan las
  // peticiones no se pisa: al final se compara (`intacto`).
  const decksAntes = readDecks();
  const lapidas = readLapidas();
  const plan = fusionarBarajas(decksAntes, remotas, lapidas, ahora);

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
  // Si aqui cambio algo mientras tanto, no se escribe: ese cambio ya programo
  // otra vuelta, que junta todo de nuevo.
  const intacto = JSON.stringify(readDecks()) === JSON.stringify(decksAntes);
  if (plan.cambioLocal && intacto) escribiendoDesdeLaNube(() => saveDecks(plan.locales));
  // Las lapidas que viajaron (o que la nube ya no necesitaba) sobran; una
  // nueva, anotada durante la vuelta, se queda para la siguiente.
  if (lapidas.length > 0) {
    const viajaron = new Set(lapidas.map((l) => `${l.id}:${l.borrada}`));
    saveLapidas(readLapidas().filter((l) => !viajaron.has(`${l.id}:${l.borrada}`)));
  }
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
  const colAntes = readColeccionActualizado();
  const planCol = fusionarColecciones(
    { coleccion: getColeccionSnapshot(), actualizado: colAntes },
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
  // Igual que con las barajas: si se cambio durante la vuelta, gana el cambio.
  if (local && readColeccionActualizado() === colAntes)
    escribiendoDesdeLaNube(() => saveColeccion(local.coleccion, local.actualizado));

  // --- Listo ---
  const fin = getEstado();
  if (fin.fase !== "con-sesion" || fin.usuario.id !== uid) return; // salio a medias
  const ultima = Date.now();
  guardarRecuerdo({ uid, ultima, alias: fin.alias, avatar: fin.avatar, publicas });
  conSesion({ ultima, publicas, error: null });

  if (plan.sinSubir !== avisadasSinSubir) {
    avisadasSinSubir = plan.sinSubir;
    if (plan.sinSubir > 0) {
      toast(
        `${plan.sinSubir === 1 ? "1 baraja de este navegador no se guardó" : `${plan.sinSubir} barajas de este navegador no se guardaron`} en tu cuenta porque ya tiene 50. Siguen aquí; borra alguna para hacerles lugar.`,
        "warning",
      );
    }
  }
  if (primeraVez && intacto && plan.traidas > 0) {
    toast(
      plan.traidas === 1
        ? "Se cargó 1 baraja desde tu cuenta."
        : `Se cargaron ${plan.traidas} barajas desde tu cuenta.`,
      "success",
    );
  }
  // Solo la primera vez: despues seria el mismo aviso en cada guardado.
  if (primeraVez && plan.noCupieron > 0) {
    toast(
      `${plan.noCupieron === 1 ? "1 baraja de tu cuenta no cabe" : `${plan.noCupieron} barajas de tu cuenta no caben`} en este navegador porque ya tienes 50. Siguen en tu cuenta.`,
      "warning",
    );
  }
}
