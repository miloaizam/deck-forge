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

## Imágenes de las cartas

Dos cosas que valen para todo este grupo: `data:images` **se salta las WebP
que ya existen** (hay que borrarlas antes de regenerar), y **una URL de imagen
ya publicada no se reutiliza** (`/cards/*` va con 7 días de caché: el arte
nuevo va con otro nombre en el campo `imagen`; ver CLAUDE.md).

Las dos entradas que quedan esperan **otra fuente del arte**: lo que se pudo
hacer con el que hay ya está hecho (04-10-2026).

### Marca de agua en Pack América y en la promo de Sarras

- **Qué pasa:** las once de Pack América (`ad-020`…`ad-030`) y la promo de
  Sarras (`aa-001`) llevan la marca de agua «Mitos y Leyendas» sobre la
  ilustración, que es como circulan en internet. Las esquinas blancas ya se
  limpiaron (`*-recorte.webp`); la marca no sale recortando.
- **Ya buscado, sin suerte:** la API, La Guarida y el fandom (Sarras_2017.png
  trae la misma marca). La marca la trae además casi todo el arte de la API
  (Dominio, Hijos del Sol, las ediciones extra…); Escuelas Elementales no.
  Quitarla en todo el catálogo es otra tarea, más grande.
- **Arreglado cuando:** aparece el arte limpio (un escaneo propio, por ejemplo)
  y las doce se ven sin marca.

### Arte a tamaño completo para las seis Legendarias de Dominio

- **Qué:** DO-001 a DO-006 (Adapa, Caída del Sol, Devorar, Nammu, Xolotl y
  Carpa Dragón) no existen en la API, y su arte se consiguió aparte a
  **354×508**. `resize_to_width()` lo amplía a 420 de ancho, así que se ven
  más blandas que el resto: en la revisión de resolución (04-10-2026) fueron
  las únicas claramente peores que Escuelas Elementales.
- **Ya buscado, sin suerte:** el fandom solo las tiene a 354×508
  (`Adapa_DO.jpg`, `Nammu_DO.jpg`; `Xolotl_DO.jpg` incluso a 320×458). Las
  imágenes grandes con el mismo nombre (`Adapa.png`, `Xolotl.jpg`) son de
  otras impresiones, con otro arte o plantilla.
- **Por dónde:** conseguir el arte a tamaño completo (un escaneo), dejarlo en
  `images-src/do-00X-v2.png`, correr `pnpm run data:images` y apuntar
  `imagen` y `thumb` de `data-src/dominio.json` al nombre nuevo.
- **Terminado cuando:** las seis se ven tan nítidas como el resto de Dominio
  en la grilla y en el modal.

## Grande y con decisiones previas

### Base de datos y cuentas de usuario

- **Qué:** conectar DeckForge a una base de datos (Supabase, por ejemplo) para
  poder crear cuentas y guardar barajas en la nube.
- **Ojo, cambia premisas del proyecto.** Hoy CLAUDE.md dice sin backend, sin
  cuentas, sin datos personales y con la CSP cerrada a `connect-src 'self'`.
  Antes de empezar hay que decidir y reescribir esas secciones (§1, §6 y §7):
  el host de la base de datos en la CSP, qué datos personales se guardan, si
  hace falta aviso de privacidad y cómo conviven las barajas de
  `localStorage` con las de la cuenta.
- **Por dónde:** el export estático se puede mantener si todo se hace desde el
  navegador con el cliente de Supabase y reglas de acceso por fila (RLS). La
  clave pública va en el bundle por diseño; la de servicio, nunca.
- **Terminado cuando:** se puede crear una cuenta, iniciar sesión y guardar y
  recuperar barajas desde otro dispositivo, con CLAUDE.md al día.
