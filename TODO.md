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

## Diseño

### Evaluar una mejora visual

- **Qué:** revisar el aspecto del sitio entero y decidir si conviene una
  mejora visual: jerarquía, espaciados, contraste en los dos temas,
  consistencia entre páginas (catálogo, constructor, barajas, colección,
  documentos) y cómo se ve en el teléfono.
- **Por dónde:** recorrer cada ruta en escritorio y teléfono, con tema claro
  y oscuro, capturar lo que desentona y contrastarlo con
  [DESIGN.md](DESIGN.md) y la guía de marca (`docs/brand.html`).
- **A decidir antes:** si es un repaso puntual (arreglar lo que desentona)
  o una renovación, que tocaría DESIGN.md.
- **Terminado cuando:** hay una lista de cambios acordada y aplicada, o la
  decisión de que no hace falta.

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
