# TODO

Todo lo pendiente del proyecto, en **una sola lista**: lo que falta hacer y lo
que existe pero está mal. Va agrupado por tema, para trabajar de a un grupo.

**Cómo se usa.** Al hacer o arreglar algo de esta lista, en el **mismo commit**
se borra su entrada. No se tacha ni se marca como hecho: lo hecho ya queda en
el historial de git y en [CLAUDE.md](CLAUDE.md), y aquí solo vive lo que falta.
Si queda a medias, se reescribe la entrada con lo que queda. Y lo que se
descubra roto y no se arregle en el momento se anota aquí, en su grupo, en vez
de perderse.

Cada entrada lleva qué es, por dónde empezar y cuándo se da por terminada.

De dónde sale lo de hoy (23-10-2026): la revisión de código (`/code-review`) y
la de seguridad (`/security-review`) de todo lo de cuentas, Comunidad y foto
de perfil (`a620db7..HEAD`), y la revisión visual de las 16 páginas a 1440,
768 y 390 px con la skill `taste-skill`.

---

## Orden sugerido

1. **Pegar el esquema en Supabase** (lo de la portada por defecto en la
   Comunidad).
2. **Cartas destacadas en la portada**, con la maqueta primero.
3. **Por decidir**, cuando haya ganas: no bloquea nada.

## Base de datos

### Pegar el esquema nuevo en Supabase

- **Qué:** `listar_publicas` devuelve ahora `principal` (las cartas de cada
  baraja, solo ids y copias), para que las tarjetas de la Comunidad sin
  portada elegida muestren su Aliado con más copias. Hasta pegarlo, esas
  tarjetas siguen con el recuadro vacío; nada se rompe.
- **Por dónde:** Supabase → SQL Editor → pegar `supabase/esquema.sql` entero
  → Run.
- **Terminado cuando:** en `/comunidad` toda tarjeta lleva una carta.

## Interfaz

### Cartas destacadas en la portada

- **Qué:** un abanico de unas 5 cartas junto al título de la portada con las
  más usadas en las barajas de la Comunidad, que rota: cambia una carta cada
  5–6 s con un fundido, se pausa con el cursor encima y queda quieto con
  «reducir movimiento». Al tocar una carta se abre en el catálogo. En el
  teléfono va más chico y bajo el título. Es lo que la crítica pone primero:
  hoy la portada no muestra ninguna carta (6,4).
- **Decisiones ya tomadas:**
  - Cuentan **solo las barajas públicas** y no ocultas, por `identidad` (las
    impresiones de una carta suman juntas) y en las últimas semanas.
  - El ranking sale de **Supabase**, con una función `security definer` en
    `supabase/esquema.sql`, y la base apenas trabaja: se guarda ya calculado
    (una tabla o vista materializada que se recalcula al publicar o una vez al
    día, no en cada visita) y la portada lee solo esas ~12 filas, con caché.
  - Antes de construir, una **maqueta** en captura para aprobarla.
- **Por dónde:** el HTML trae un grupo fijo elegido a mano (las Legendarias,
  por ejemplo), para que la portada se vea entera sin red y no empeore el LCP;
  al terminar de cargar pide el ranking en segundo plano y cambia a esas
  cartas. Con menos de ~10 barajas públicas, o si Supabase no responde, se
  queda el grupo fijo. Es una segunda excepción a «un visitante sin cuenta no
  le pide nada a Supabase» (hoy solo la Comunidad): cambiar en el mismo commit
  CLAUDE.md §6.5, `/privacidad` y la prueba de `e2e/nube.spec.ts` que lo
  vigila.
- **Terminado cuando:** la maqueta está aprobada, la portada rota con el
  ranking real, pasan `e2e`, `e2e:nube` y `a11y`, y Lighthouse no baja en la
  portada.

## Por decidir

Salió de la revisión visual con `taste-skill`. Son cosas que esa skill marca
como defecto y que hoy son decisiones de la marca; no se tocan sin decidirlo.

### Documentos con media pantalla vacía

- **Qué:** bajo las tarjetas de la Fe de Erratas y la Banlist no hay nada.
- **Opciones:** dejarla así (es una página de paso) o agregar debajo lo último
  que cambió en cada documento.

### Columnas angostas en Novedades y Privacidad

- **Qué:** en escritorio el texto ocupa ~650 px y deja vacía la derecha. La
  skill lo castiga; para texto de lectura es lo correcto.
- **Recomendación:** dejarlo como está.

### Lo que la skill considera «plantilla»

- **Qué:** el violeta de marca, el degradado y el título degradado de la
  portada, las etiquetas chicas en mayúsculas sobre cada título («BARAJAS»,
  «COMUNIDAD», «TODO»), los iconos dentro de círculos de color, las pastillas
  («Legal», «Oro inicial»), el brillo violeta de la última novedad y las
  etiquetas «DONDE DICE / DEBE DECIR» de la Fe de Erratas.
- **Recomendación:** mantenerlos; son coherentes en todo el sitio y están en
  DESIGN.md. Lo único que valdría revisar es la etiqueta «TODO» del catálogo,
  que no dice nada.
