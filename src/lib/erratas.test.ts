import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createDeck } from "./deck";
import { buildCardIndex, canAdd, limiteDeCopias, validateDeck } from "./deck-rules";
import { FALTAN_EN_EL_CATALOGO, claveDeNombre } from "./documentos";
import {
  conErratas,
  efectoEnReglas,
  erratasDe,
  estaBaneada,
  fueraDelBloque,
  nombresConErrata,
  tieneErrata,
} from "./erratas";
import { keywordsPropias } from "./ability";
import { TEXTOS_ERRATADOS } from "./erratas-aplicadas";
import { FORMATOS, catalogSchema, type Card, type Formato } from "./types";

/** La Fe de Erratas y la Banlist aplicadas, contra el catalogo real. */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const INDEX = buildCardIndex(CATALOGO);
const porNombre = (nombre: string) => {
  const c = CATALOGO.find((c) => claveDeNombre(c.nombre) === claveDeNombre(nombre));
  assert.ok(c, nombre);
  return c;
};
const regla = (nombre: string) => INDEX.porId.get(porNombre(nombre).id)!;

test("cada errata y cada baneada nombra una carta del catalogo", () => {
  const nombres = new Set(CATALOGO.map((c) => claveDeNombre(c.nombre)));
  const sueltas = nombresConErrata().filter((n) => !nombres.has(n));
  // "Caida de Sol" es el nombre NUEVO de una errata de nombre: la carta se
  // llama todavia "Caida del Sol" en el catalogo, que guarda el original. Las
  // demas son las que faltan cargar (`FALTAN_EN_EL_CATALOGO`).
  assert.deepEqual(
    [...new Set(sueltas)].sort(),
    [claveDeNombre("Caída de Sol"), ...FALTAN_EN_EL_CATALOGO.map(claveDeNombre)].sort(),
  );
});

test("la errata alcanza a todas las impresiones, Arte Alternativo incluido", () => {
  // Sarras: Unica por la Banlist, con impresiones en tres ediciones.
  const sarras = CATALOGO.filter((c) => c.nombre === "Sarras");
  assert.ok(sarras.some((c) => c.edicion === "arte-alternativo"));
  for (const c of sarras) {
    assert.ok(tieneErrata(c), c.id);
    assert.equal(limiteDeCopias(INDEX.porId.get(c.id)!), 1, c.id);
  }
});

test("la Banlist vuelve Unicas a sus 31 cartas", () => {
  for (const nombre of [
    "Yestay",
    "Paracelso",
    "Ballesta Gigante",
    "Sarras",
    "Krisna",
    "Ieyasu",
  ]) {
    assert.equal(limiteDeCopias(regla(nombre)), 1, nombre);
  }
  // Las condiciones de las cartas en observacion tambien.
  assert.equal(limiteDeCopias(regla("Wyvern Dorado")), 1);
  assert.equal(limiteDeCopias(regla("Járnvid")), 1);
});

test("Tsukuyomi deja de ser Unica, y los demas efectos a mano", () => {
  assert.equal(efectoEnReglas(porNombre("Tsukuyomi")).unica, false);
  assert.equal(regla("Tsukuyomi").unica, false);
  assert.equal(regla("Arjumand Banu Begum").coste, 1);
  assert.equal(regla("Harionna").atributo, "Oscuridad");
});

test("el catalogo sigue mostrando el texto original", () => {
  // La errata va aparte: la carta no cambia en cards.json.
  const arjumand = porNombre("Arjumand Banu Begum");
  assert.equal(arjumand.coste, 2);
  assert.ok(erratasDe(arjumand).length > 0);
});

test("una baneada se agrega con aviso, y la baraja no cumple", () => {
  const bechard = regla("Bechard");
  assert.ok(estaBaneada(porNombre("Bechard")));
  const deck = createDeck("Con Bechard");
  const check = canAdd(deck, bechard, "principal", INDEX);
  assert.ok(check.ok);
  assert.match(check.ok ? (check.aviso ?? "") : "", /baneada/);

  const conBechard = { ...deck, principal: [{ id: bechard.id, n: 1 }] };
  const issues = validateDeck(conBechard, INDEX);
  const prohibida = issues.find((i) => i.code === "carta-prohibida");
  assert.ok(prohibida);
  assert.equal(prohibida.gravedad, "error");
  assert.match(prohibida.mensaje, /Bechard/);
});

test("con Shingas en la baraja, Karna topa en una copia", () => {
  const shingas = regla("Shingas");
  const karna = regla("Karna");
  const deck = {
    ...createDeck("Desafiante"),
    principal: [
      { id: shingas.id, n: 1 },
      { id: karna.id, n: 2 },
    ],
  };
  assert.ok(validateDeck(deck, INDEX).some((i) => i.code === "shingas-karna"));
  // Sin Shingas, tres Karna estan bien.
  const solo = { ...deck, principal: [{ id: karna.id, n: 3 }] };
  assert.ok(!validateDeck(solo, INDEX).some((i) => i.code === "shingas-karna"));
  // Y con Shingas y una Karna, no entra la segunda.
  const una = { ...deck, principal: [deck.principal[0], { id: karna.id, n: 1 }] };
  assert.equal(canAdd(una, karna, "principal", INDEX).ok, false);
});

test("cada cambio a mano encuentra su texto en todas las impresiones", () => {
  for (const [nombre, t] of Object.entries(TEXTOS_ERRATADOS)) {
    const impresiones = CATALOGO.filter((c) => c.nombre === nombre);
    assert.ok(impresiones.length > 0, `${nombre}: no esta en el catalogo`);
    for (const c of impresiones) {
      for (const [antes] of t.cambia ?? []) {
        assert.ok(c.habilidad.includes(antes), `${c.id}: no dice «${antes}»`);
      }
    }
  }
});

test("una Unica nunca es ademas Errante", () => {
  // Una sola copia en la baraja ya impide la segunda en mesa. Si una edicion
  // nueva las imprime juntas, esto falla y hay que decidir que hacer. En los
  // tres formatos: cada Banlist hace Unicas y Errantes a su manera.
  for (const f of FORMATOS) {
    for (const c of CATALOGO) {
      const k = conErratas(c, f).keywords;
      assert.ok(
        !(k.includes("Única") && k.includes("Errante")),
        `${f} ${c.id} ${c.nombre}`,
      );
    }
  }
  // Las dos que la Banlist vuelve Unicas pierden la Errante impresa.
  for (const nombre of ["Krisna", "Anubis de Inpu"]) {
    const e = conErratas(porNombre(nombre));
    assert.ok(e.keywords.includes("Única"), nombre);
    assert.ok(!e.keywords.includes("Errante"), nombre);
    assert.doesNotMatch(e.habilidad, /Errante/, nombre);
  }
});

test("el catalogo lleva el texto erratado, con sus keywords", () => {
  const erratada = (nombre: string) => conErratas(porNombre(nombre));
  // La Unica de la Banlist entra al texto y a las keywords.
  const teutates = erratada("Teutates");
  assert.match(teutates.habilidad, /^Única\.\n/);
  assert.ok(teutates.keywords.includes("Única"));
  // Delante de una linea que ya solo declara.
  assert.match(erratada("Paracelso").habilidad, /^Única\. Guardián\.\n/);
  // Tsukuyomi pasa de Unica a Errante.
  const tsukuyomi = erratada("Tsukuyomi");
  assert.ok(tsukuyomi.keywords.includes("Errante"));
  assert.ok(!tsukuyomi.keywords.includes("Única"));
  // Coste, atributo y nombre.
  assert.equal(erratada("Arjumand Banu Begum").coste, 1);
  const harionna = erratada("Harionna");
  assert.equal(harionna.atributo, "Oscuridad");
  assert.ok(harionna.keywords.includes("Oscuridad"));
  assert.equal(erratada("Caída del Sol").nombre, "Caída de Sol");
  assert.match(erratada("Lahmu").habilidad, /entre en juego bajo tu control/);
  // Una carta sin errata sale tal cual.
  const sin = CATALOGO.find((c) => !tieneErrata(c))!;
  assert.equal(conErratas(sin), sin);
  // Y las keywords siempre cuadran con lo que el texto declara.
  for (const c of CATALOGO) {
    const e = conErratas(c);
    for (const k of keywordsPropias(e.habilidad)) assert.ok(e.keywords.includes(k), e.id);
    if (efectoEnReglas(c).unica === true) assert.ok(e.keywords.includes("Única"), e.id);
  }
});

/* Cada formato con su Banlist; la Fe de Erratas, comun. */

const INDICES = Object.fromEntries(
  FORMATOS.map((f) => [f, buildCardIndex(CATALOGO, f)]),
) as Record<Formato, ReturnType<typeof buildCardIndex>>; // una entrada por formato
const reglaEn = (f: Formato, nombre: string) =>
  INDICES[f].porId.get(porNombre(nombre).id)!;

test("cada formato banea lo suyo", () => {
  // Pergamino de Agua, en las tres.
  for (const f of FORMATOS) assert.ok(estaBaneada(porNombre("Pergamino de Agua"), f), f);
  // Scarbo: Unica en Estandar, baneada en VCR e Infanteria.
  assert.ok(!estaBaneada(porNombre("Scarbo"), "estandar"));
  assert.equal(reglaEn("estandar", "Scarbo").unica, true);
  assert.ok(estaBaneada(porNombre("Scarbo"), "vcr"));
  assert.ok(estaBaneada(porNombre("Scarbo"), "infanteria"));
  // Koan: Unica en VCR, baneada en Infanteria, libre en Estandar.
  assert.equal(reglaEn("vcr", "Koan").unica, true);
  assert.equal(reglaEn("infanteria", "Koan").legalidad, "prohibida");
  assert.equal(reglaEn("estandar", "Koan").legalidad, "libre");
  // Bechard: baneada en Estandar y VCR, Unica en Infanteria.
  assert.equal(reglaEn("infanteria", "Bechard").legalidad, "libre");
  assert.equal(reglaEn("infanteria", "Bechard").unica, true);
});

test("las erratas de la Banlist Estandar no valen en VCR ni Infanteria", () => {
  assert.equal(reglaEn("estandar", "Arjumand Banu Begum").coste, 1);
  assert.equal(reglaEn("vcr", "Arjumand Banu Begum").coste, 2);
  assert.doesNotMatch(conErratas(porNombre("Amaterasu"), "vcr").habilidad, /y\/o Eterno/);
  assert.match(conErratas(porNombre("Amaterasu"), "estandar").habilidad, /y\/o Eterno/);
  // Lo que tambien dice la Fe de Erratas vale en los tres.
  for (const f of FORMATOS) {
    assert.match(
      conErratas(porNombre("Lahmu"), f).habilidad,
      /entre en juego bajo tu control/,
    );
  }
  // Shingas y Karna: regla de la Estandar.
  const deck = (formato: Formato) => ({
    ...createDeck("Desafiante"),
    formato,
    principal: [
      { id: porNombre("Shingas").id, n: 1 },
      { id: porNombre("Karna").id, n: 2 },
    ],
  });
  assert.ok(
    validateDeck(deck("estandar"), INDICES.estandar).some(
      (i) => i.code === "shingas-karna",
    ),
  );
  assert.ok(
    !validateDeck(deck("vcr"), INDICES.vcr).some((i) => i.code === "shingas-karna"),
  );
});

test("las Errantes de la lista entran al texto y quitan la Unica", () => {
  // Tsukuyomi: VCR la lista Errante, como la Estandar en su errata.
  for (const f of ["estandar", "vcr"] as const) {
    const t = conErratas(porNombre("Tsukuyomi"), f);
    assert.ok(t.keywords.includes("Errante"), f);
    assert.ok(!t.keywords.includes("Única"), f);
    assert.equal(reglaEn(f, "Tsukuyomi").unica, false, f);
  }
  assert.ok(conErratas(porNombre("Dodomeki"), "infanteria").keywords.includes("Errante"));
  assert.ok(!conErratas(porNombre("Dodomeki"), "vcr").keywords.includes("Errante"));
  // Piedad: Errante por la Fe de Erratas, Unica por las Banlists de VCR e
  // Infanteria. Manda la Banlist.
  const piedad = conErratas(porNombre("Piedad"), "vcr");
  assert.ok(piedad.keywords.includes("Única"));
  assert.ok(!piedad.keywords.includes("Errante"));
  assert.ok(tieneErrata(porNombre("Dodomeki"), "infanteria"));
  assert.ok(!tieneErrata(porNombre("Dodomeki"), "estandar"));
});

test("las cartas de fuera del bloque entran solo si la Banlist las nombra", () => {
  for (const f of FORMATOS)
    assert.equal(fueraDelBloque(porNombre("Wyvern Dorado"), f), f === "infanteria");
  assert.ok(!fueraDelBloque(porNombre("Wotan"), "estandar"));
  assert.ok(fueraDelBloque(porNombre("Wotan"), "vcr"));
  // Las de las diez ediciones nunca.
  assert.ok(!fueraDelBloque(porNombre("Scarbo"), "infanteria"));
  assert.equal(reglaEn("vcr", "Wotan").fueraDeFormato, "fuera-del-bloque");
  assert.equal(reglaEn("vcr", "Wyvern Dorado").unica, true);
  // Mut: Errante en VCR.
  assert.ok(conErratas(porNombre("Mut"), "vcr").keywords.includes("Errante"));
  assert.ok(erratasDe(porNombre("Mut"), "vcr").length > 0);
});
