# Pendientes

Funcionalidades y cambios **por hacer**: lo que todavía no existe. Los errores y
las cosas que existen pero están mal van en [ISSUES.md](ISSUES.md).

**Cómo se usa.** Al implementar algo de esta lista, en el **mismo commit** se
borra su entrada. No se tacha ni se marca como hecho: lo hecho ya queda en el
historial de git y en [CLAUDE.md](CLAUDE.md), y aquí solo vive lo que falta. Si
se implementa a medias, se reescribe la entrada con lo que queda.

Cada entrada lleva qué es, por qué importa, por dónde empezar y cuándo se da por
terminada.

---

## Página de erratas

`/erratas` es hoy un placeholder (`src/app/(app)/erratas/page.tsx`).

- **Por qué:** al cargar Escuelas Elementales quedaron **66 cartas cuyo texto
  cambió entre impresiones**. El catálogo muestra el texto vigente y no dice en
  ninguna parte que la impresión vieja decía otra cosa. Un mazo con tres
  Tezcatlipoca de Hijos del Sol dejó de ser legal porque hoy es Única, y el
  jugador no tiene dónde verlo.
- **Por dónde:** listar, por carta, el texto impreso en cada edición frente al
  vigente. Hay que decidir de dónde sale el texto viejo (hoy se sobrescribió en
  `data-src/` al propagar el de EE hacia atrás).
- **Terminado cuando:** la página muestra las cartas erratadas con su texto
  anterior y el vigente, y la entrada de CLAUDE.md que la da por pendiente se
  actualiza.

## Banlist del formato

- **Por qué:** el formato tiene cartas prohibidas y restringidas, y el
  constructor hoy deja armar cualquier cosa.
- **Ya existe:** el campo `legalidad` (`libre` / `restringida` / `prohibida`)
  en `src/lib/types.ts` y `scripts/schema.py`, y las reglas `carta-prohibida` y
  `carta-restringida` en `validateDeck` (`src/lib/deck-rules.ts`). Hoy no
  disparan porque todas las cartas son `libre`.
- **Falta:** cargar la banlist vigente en los datos, decidir qué significa
  `restringida` (¿una copia?) y mostrarlo en el catálogo y el constructor.
- **Terminado cuando:** las cartas prohibidas y restringidas del formato están
  marcadas y el validador las rechaza o limita, con su test.

## Exportar el mazo como imagen

Del roadmap, Fase 3 (`docs/plan.md`).

- **Por qué:** para compartir el mazo en redes sociales, donde un enlace dice
  menos que una imagen.
- **Ojo:** sin servidor y sin dependencias nuevas si se puede (canvas del
  navegador), y respetando la CSP: nada de recursos externos.
- **Terminado cuando:** desde `/mazo` se puede descargar una imagen del mazo.

---

## Opcionales (solo si se decide hacerlos)

- **Faceta de *mecánica*** (`Alimentar`, `Purificar`, `Honor`): salieron del
  filtro de habilidad porque responden a qué *hace* la carta y no a qué *es*.
  Si vuelven, que sea como faceta aparte, no mezcladas con las keywords.
- **Cuentas y mazos en la nube** (Supabase, `docs/plan.md`). Rompe la premisa
  de sitio 100 % estático y sin datos personales: requiere revisar la sección
  de seguridad y privacidad de CLAUDE.md antes de empezar.
