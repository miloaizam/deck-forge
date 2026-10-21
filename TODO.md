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

### Imagen de la carta en «3D» en el detalle

- **Qué:** que la imagen del modal de una carta se incline un poco siguiendo
  el cursor (o el giroscopio en el teléfono), con un brillo que se mueve, como
  en tor.myl.
- **Por dónde:** `CardModal.tsx`. Se puede hacer con CSS (`perspective` y
  `rotateX`/`rotateY` desde variables que pone un `pointermove`) sin
  dependencias. Ojo: con «reducir movimiento» no se inclina, y el
  giroscopio en iOS pide permiso.
- **Terminado cuando:** la carta se inclina con suavidad, vuelve a su sitio al
  salir y respeta «reducir movimiento».

## Datos

### Reimpresiones en los kits entre Conjuros y Furia

- **Qué:** revisar los kits y mazos que salieron entre Conjuros y Furia
  buscando reimpresiones de cartas del catálogo que falten en Arte
  Alternativo. Quedan fuera las ediciones ya revisadas entre Bushido y
  Escuelas Elementales. **Mariamman** del Kit Eterno ya está (`aa-420`); el
  resto de los kits de **Colecciones Raciales 2021** (y los de 2020) está
  sin revisar.
- **Por dónde:** el listado de productos del fandom (la plantilla de cada
  carta trae una tabla «Otras versiones» con cada reimpresión, y
  `Lista de cartas de Colecciones Raciales 2021`); la API no tiene los kits.
  Mismo criterio que la carga de Arte Alternativo
  (CLAUDE.md): que la habilidad sea igual o casi igual, y consultar los
  casos dudosos.
- **Terminado cuando:** cada kit está revisado y sus reimpresiones cargadas
  en `data-src/arte-alternativo.json`.

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
