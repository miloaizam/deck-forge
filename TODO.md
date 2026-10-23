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

---

## Revisiones

### Revisión de código de los últimos cambios

- **Qué:** correr la skill `code-review` sobre lo hecho desde que se
  encendieron las cuentas (22-10-2026): sesión y sincronización, Comunidad,
  likes, copias y reportes, foto de perfil y los cambios de la barra de
  búsqueda. Busca errores de lógica, no estilo.
- **Por dónde:** `/code-review` sobre el rango de commits desde el que
  encendió `supabase/proyecto.json`. Lo que encuentre y no se arregle en el
  momento se anota aquí.
- **Terminado cuando:** cada hallazgo está arreglado o descartado con su
  motivo.

### Revisión de seguridad

- **Qué:** correr la skill `security-review` sobre lo mismo, con foco en lo
  que entra de afuera: las reglas por fila y las funciones `security definer`
  de `supabase/esquema.sql`, el bucket `avatares` y sus políticas, lo que
  responde Supabase (`comunidad.ts`, `sync.ts`, `avatar.ts`), la sesión de
  `auth-js` y la vuelta de Google (`tomarVuelta`), y la CSP con el host de
  Supabase.
- **Por dónde:** `/security-review`. Lo que toque la base se prueba contra el
  Postgres local con el `storage` de imitación (`docs/cuentas.md`).
- **Terminado cuando:** cada hallazgo está arreglado o descartado con su
  motivo; si cambia el esquema, se vuelve a pegar en Supabase.

## Interfaz

### Cartas destacadas en la portada

- **Qué:** un abanico de unas 5 cartas junto al título de la portada con las
  más usadas en las barajas de la Comunidad, que rota: cambia una carta cada
  5–6 s con un fundido, se pausa con el cursor encima y queda quieto con
  «reducir movimiento». Al tocar una carta se abre en el catálogo. En el
  teléfono va más chico y bajo el título.
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

### La pila de Oros en el detalle de una baraja

- **Qué:** en la mesa de `/baraja` cada copia se dibuja desplazada, así que 35
  Oros sin habilidad hacen una columna de tres pantallas, casi vacía al lado.
  Es lo primero que se ve, y empuja «Probar una mano» y la curva de coste bajo
  el pliegue. Pasa en la propia, en la pública y en el teléfono (revisión
  visual del 23-10-2026).
- **Por dónde:** dibujar como mucho 4 o 5 cartas por pila y el total encima
  («×35»).
- **Terminado cuando:** una baraja con 35 Oros cabe en una pantalla de
  escritorio con sus tarjetas de análisis a la vista.

### El buscador del teléfono se corta

- **Qué:** con el ancho fijo de la barra de búsqueda, a 390 px el campo del
  catálogo, de cada edición y de la colección dice «Nombre o habilid…», con
  un hueco hasta el botón de filtros.
- **Por dónde:** `Filters.tsx`: el ancho fijo desde `sm`, y en el teléfono el
  campo ocupa lo que deja el botón.
- **Terminado cuando:** a 360 y 390 px se lee el texto entero y el ancho
  sigue fijo en escritorio y tableta.

### Los órdenes de la Comunidad se cortan en el teléfono

- **Qué:** los segmentos «Más likes / Tendencia / Más recientes / Más
  copiadas» se deslizan de lado (`overflow-x-auto` de `SEGMENTOS`), pero nada
  lo indica: «Más recientes» queda a medias y «Más copiadas» no se ve.
- **Por dónde:** `ComunidadView.tsx`. En el teléfono, un `Select` como el de
  afinidades, o que los segmentos bajen de línea.
- **Terminado cuando:** a 360 px se ven o se alcanzan las cuatro opciones sin
  adivinar.

### Portada por defecto en las tarjetas de barajas

- **Qué:** sin portada elegida, la tarjeta de Mis barajas va sin imagen y la
  de la Comunidad muestra un recuadro oscuro vacío. Las dos vistas no dicen
  lo mismo y la tarjeta no se reconoce de un vistazo.
- **Por dónde:** `DeckListView.tsx` y `ComunidadView.tsx`: si no hay
  `portada`, usar el Aliado con más copias (o la primera carta del orden del
  catálogo).
- **Hay que decidir:** qué carta hace de portada por defecto.
- **Terminado cuando:** las dos vistas muestran una carta en toda tarjeta con
  cartas.

### El lazo «Errata» mide 10 px

- **Qué:** el lazo de las cartas de la grilla (`CardRibbons.tsx`) está bajo el
  mínimo de 11 px para texto.
- **Terminado cuando:** mide 11 px y sigue cabiendo en la esquina del tile.

### «Tu cuenta» en dos columnas

- **Qué:** en escritorio el contenido ocupa ~600 px y deja vacío el 40 %
  derecho de la pantalla.
- **Por dónde:** `CuentaView.tsx`: el perfil a la izquierda y Alias y
  Sincronización a la derecha; «Borrar la cuenta» al pie, a lo ancho.
- **Terminado cuando:** a 1440 px no queda una columna vacía al lado.

### Las tarjetas de análisis del detalle, a la misma altura

- **Qué:** «Probar una mano» y «Curva de coste» van lado a lado y la curva
  queda con una franja vacía de ~180 px (o la mano, de ~40) porque cada una
  mide distinto.
- **Por dónde:** `HandTester.tsx` y `CostCurve.tsx` en el detalle: igualar
  alturas y centrar el gráfico.
- **Terminado cuando:** ninguna de las dos tiene una banda vacía dentro.

## Por decidir

Salió de la revisión visual con la skill `taste-skill` (23-10-2026). Son
cosas que esa skill marca como defecto y que hoy son decisiones de la marca;
no se tocan sin decidirlo.

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
