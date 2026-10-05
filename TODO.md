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

## Funciones nuevas

### Vista de colección

- **Qué:** que cada jugador marque qué cartas tiene (y cuántas copias) y vea
  de un vistazo lo que le falta: por edición, un contador del tipo «212 / 246»
  y la grilla separando lo que tiene de lo que no.
- **Por dónde:** una ruta `/coleccion` que reutilice la grilla y los filtros
  del catálogo, con un filtro más, «Tengo / Me faltan», y un control de copias
  en cada carta. Como las barajas, vive en `localStorage` con su propia clave,
  se valida con Zod al leerla (CLAUDE.md, seguridad #4) y se exporta e importa
  como el respaldo de barajas, para pasarla a otro navegador. Si algún día hay
  cuentas (entrada siguiente), la colección sube con ellas.
- **A decidir antes:** si los artes alternativos y las reimpresiones se
  cuentan como impresiones aparte (coleccionista) o juntos por `identidad`
  (jugador); y si el constructor y el detalle de una baraja marcan las cartas
  que el jugador no tiene.
- **Terminado cuando:** se puede marcar una carta, ver qué falta de una
  edición, recargar sin perderlo y llevarlo a otro navegador con el respaldo.

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
