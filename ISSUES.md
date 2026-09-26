# Issues

Errores, bugs y cosas que **existen pero hay que arreglar o mejorar**. Lo que
todavía no existe va en [TODO.md](TODO.md).

**Cómo se usa.** Al encontrar un problema que no se arregla en el momento, se
anota aquí. Al arreglarlo, en el **mismo commit** se borra su entrada. No se
tacha ni se marca como resuelto: lo resuelto queda en el historial de git, y
aquí solo vive lo que sigue roto. Si el arreglo es parcial, se reescribe la
entrada con lo que queda.

Cada entrada lleva qué pasa, dónde, y cómo se comprueba que está arreglado.
Ordenadas de más a menos importante.

---

## Nueva revisión del catálogo: podrían faltar cartas

- **Qué pasa:** hay cartas que dan la impresión de no estar en el catálogo.
  Además de las faltantes, conviene aprovechar la pasada para buscar errores
  de datos que se hayan escapado.
- **Precedentes:** la API ya escondió cartas antes. Por arriba, Sol Naciente
  tenía a Takemikazuchi (SN-143) fuera del listado; por abajo, las seis
  Legendarias de Dominio no existen en la API; y la extensión de Escuelas
  Elementales tampoco estaba.
- **Por dónde:**
  - Contar las cartas de cada edición contra su total **impreso** en el pie
    (`ESC-040-300`, `SOL-013-232`…) y contra la lista del fandom.
  - Buscar huecos en la numeración de cada edición.
  - Probar `/static/cards/<ed>/<n>.png` unos números más allá del último y
    también desde 001.
  - Revisar las promos, que el fandom no lista.
- **Arreglado cuando:** cada edición cuadra con su total impreso, o la
  diferencia queda explicada en CLAUDE.md como se hizo con Ordalía y la promo
  dorada de Sarras.

## Arte a baja resolución en las seis Legendarias de Dominio

- **Qué pasa:** DO-001 … DO-006 no existen en la API y su arte se consiguió a
  354×508; `resize_to_width()` lo amplía a 420 de ancho, así que se ve más
  blando que el resto.
- **Arreglo:** conseguir el arte a tamaño completo, borrar
  `public/cards/do-00X.webp` y su `thumb/`, y volver a correr
  `pnpm run data:images`.

## La estrella de portada no se ve en pantallas táctiles

- **Qué pasa:** en la página de una baraja, el botón para elegir la carta de
  portada (una estrella) solo se hace visible al pasar el cursor o al
  enfocarlo con el teclado (`opacity-0 group-hover:opacity-100` en
  `BotonPortada`, `src/components/decks/DeckSections.tsx`). En un teléfono no
  hay cursor: el botón está y se puede tocar, pero no se ve, así que nadie sabe
  que existe. La ayuda del sitio lo explica con el cursor por eso mismo.
- **Arreglo posible:** mostrarlo siempre en pantallas sin cursor
  (`@media (hover: none)` o la variante `pointer-coarse:` de Tailwind), manteniendo
  el ocultamiento en escritorio, donde cincuenta estrellas a la vez serían ruido.
- **Arreglado cuando:** en un teléfono se ve la estrella de cada carta y se
  puede elegir la portada; y la respuesta de la ayuda (`src/lib/faq.ts`) deja
  de hablar solo del cursor.
