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

## Un mazo compartido pasa por los logs de Cloudflare

- **Qué pasa:** el enlace `/mazo/?d=…` lleva el mazo en la query string, que
  llega al servidor y puede quedar en los logs del borde.
- **Arreglo posible:** moverlo al fragmento (`#d=`), que no sale del
  navegador. Cuesta la reactividad de `useSearchParams` y hay que seguir
  leyendo los enlaces `?d=` ya compartidos.
- **Prioridad baja:** el mazo no es un dato personal. Está documentado en
  CLAUDE.md, §6.7.

## Arte a baja resolución en las seis Legendarias de Dominio

- **Qué pasa:** DO-001 … DO-006 no existen en la API y su arte se consiguió a
  354×508; `resize_to_width()` lo amplía a 420 de ancho, así que se ve más
  blando que el resto.
- **Arreglo:** conseguir el arte a tamaño completo, borrar
  `public/cards/do-00X.webp` y su `thumb/`, y volver a correr
  `pnpm run data:images`.

## Documentación desactualizada

- `CLAUDE.md`, tabla del stack: dice que `minisearch` está "instalado, aún sin
  usar", pero el buscador ya lo usa (`src/lib/catalog.ts`).
- `CLAUDE.md`, §9: la línea de rutas marca `/constructor` y `/barajas` como
  placeholder; ya son el constructor y la lista de barajas.
- `CLAUDE.md`, §6.1: dice que las cabeceras las aplica "Cloudflare Pages"; el
  hosting es Cloudflare Workers con Static Assets.
- `docs/plan.md` sigue hablando de Vite, `tailwind.config.js` y Cloudflare
  Pages, y su roadmap no refleja lo ya hecho.
- **Arreglado cuando:** los cuatro puntos dicen lo que hace el código hoy.
