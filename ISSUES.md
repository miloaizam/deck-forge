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

## `wrangler.jsonc` describe un despliegue que no se usa

- **Qué pasa:** el sitio se publica en **Cloudflare Pages**, pero
  `wrangler.jsonc` configura un despliegue en **Workers** con Static Assets
  (`assets.directory`, `not_found_handling`). Pages solo toma un archivo de
  wrangler que declare `pages_build_output_dir`, y este no lo declara: lo más
  probable es que Pages lo ignore (el log del build de Pages lo dice). Es
  configuración muerta que hace creer que el hosting es otro, y así se
  documentó mal hasta hace poco.
- **Arreglo, a elegir:**
  - **Borrarlo**, si Pages se configura solo desde su panel.
  - **Convertirlo en configuración de Pages** (`name` +
    `pages_build_output_dir: "./out"`). Ojo: si el archivo es válido para
    Pages, pasa a mandar sobre lo que diga el panel.
- **De paso, comprobar en el panel de Pages** que el build sea
  `pnpm run build` con salida `out`. Con `next build` a secas el sitio
  funciona, pero sin los hashes: sale con la CSP floja de antes.
- **Arreglado cuando:** el repo no describe un hosting que no se usa, y el
  build de Pages escribe los hashes (la CSP publicada no lleva
  `'unsafe-inline'` en `script-src`).
