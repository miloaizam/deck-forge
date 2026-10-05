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

### La colección en las barajas

- **Qué:** que el constructor y el detalle de una baraja marquen las cartas
  que el jugador no tiene en su colección (`/coleccion`), y que Mis barajas
  diga cuántas le faltan para armar cada una.
- **Por dónde:** `useColeccion()` ya se puede leer desde cualquier vista; las
  copias se comparan por `identidad`, sumando todas las impresiones, porque
  para jugar cualquier arte vale.
- **Terminado cuando:** una baraja dice qué cartas faltan y se pueden copiar
  como lista.

### Ordenar el catálogo

- **Qué:** elegir el orden de la grilla (nombre, coste, Fuerza) además del
  orden fijo de hoy, por edición y frecuencia.
- **A decidir antes:** hoy el orden es uno solo y lo comparten las cuatro
  vistas (`card-order.ts`, CLAUDE.md) para que una carta no cambie de sitio
  entre ellas. Un orden elegible rompe eso a propósito: decidir si vale solo
  en el catálogo o también en el constructor, y si va en la URL.
- **Terminado cuando:** el orden se elige en el catálogo, se conserva al ir y
  volver, y el orden por defecto sigue siendo el de hoy.

### Portada con accesos directos

- **Qué:** la portada solo tiene «Entrar a la forja». Sumar dos accesos
  secundarios, al catálogo y al constructor, para quien ya sabe a qué viene.
- **Terminado cuando:** la portada lleva los dos enlaces sin restarle peso al
  botón principal, en escritorio y en teléfono.

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
