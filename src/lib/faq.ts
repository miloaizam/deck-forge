/**
 * Preguntas frecuentes: el contenido del panel de ayuda de la navbar.
 *
 * Cada respuesta describe lo que la interfaz hace HOY, con los nombres que
 * muestra en pantalla. Si cambia un boton o una regla, se cambia aqui en el
 * mismo commit: una ayuda que contradice al sitio es peor que no tenerla.
 *
 * Texto plano: se pinta como texto, nunca como HTML (CLAUDE.md, seguridad #3).
 * Cada string de `respuesta` es un parrafo; `lista`, si esta, va despues.
 *
 * Las palabras clave van entre dobles asteriscos (`**Mis barajas**`) y el panel
 * las pinta en negrita violeta. Se marcan con criterio: nombres de botones y
 * secciones que el usuario va a buscar en pantalla, y terminos de reglas. Si
 * todo esta resaltado, nada destaca.
 */

export interface FaqItem {
  pregunta: string;
  respuesta: string[];
  lista?: string[];
}

export interface FaqSection {
  titulo: string;
  items: FaqItem[];
}

export interface Segmento {
  texto: string;
  destacado: boolean;
}

/**
 * Parte un texto en trozos normales y destacados segun los `**`. Con split y
 * un grupo de captura, los indices impares son siempre lo que iba entre
 * asteriscos. Los trozos vacios se descartan.
 */
export function segmentos(texto: string): Segmento[] {
  return texto
    .split(/\*\*(.+?)\*\*/)
    .map((t, i) => ({ texto: t, destacado: i % 2 === 1 }))
    .filter((s) => s.texto !== "");
}

export const FAQ: FaqSection[] = [
  {
    titulo: "Primeros pasos",
    items: [
      {
        pregunta: "¿Qué es DeckForge?",
        respuesta: [
          "Un **constructor de barajas** para el formato **Escuelas Elementales** de Mitos y Leyendas. Tiene el catálogo completo de las diez ediciones del formato, más las cartas de sus packs especiales (en **Adicionales**) y otros artes de cartas que ya están (en **Arte Alternativo**), y te ayuda a armar una baraja que cumpla las reglas.",
        ],
      },
      {
        pregunta: "¿Necesito crear una cuenta?",
        respuesta: [
          "**No.** Todo funciona en tu navegador: no hay registro ni contraseña, y es **gratis**.",
        ],
      },
    ],
  },
  {
    titulo: "El catálogo",
    items: [
      {
        pregunta: "¿Cómo encuentro una carta?",
        respuesta: [
          "Escribe en el **buscador** el nombre o parte de lo que dice la carta. Con el **botón del embudo** abres los filtros: edición, habilidad, tipo, raza, escuela elemental, frecuencia, coste y fuerza. El número del botón te dice cuántos filtros tienes puestos.",
          "**Toca una carta** para verla en grande, con su texto completo y el nombre de quien la ilustró.",
        ],
      },
      {
        pregunta: "¿En qué orden salen las cartas?",
        respuesta: [
          "Primero la **edición más nueva**, Escuelas Elementales, y después Bushido; al final, Adicionales y Arte Alternativo. Dentro de cada edición, de la **frecuencia más rara** a la más común. Arte Alternativo va antes agrupado por la edición de donde sale cada arte, de la más nueva a la más vieja.",
        ],
      },
    ],
  },
  {
    titulo: "El constructor",
    items: [
      {
        pregunta: "¿Cómo armo una baraja?",
        respuesta: [
          "Entra a **Constructor** y agrega cartas con el botón **+** de cada una. El panel **«La baraja»** (en el teléfono, la barra de abajo) lleva la cuenta, muestra la **curva de coste** y te dice qué falta para que la baraja sea legal.",
        ],
      },
      {
        pregunta: "¿Qué reglas revisa?",
        respuesta: ["Las del formato:"],
        lista: [
          "**50 cartas** justas, contando el oro inicial.",
          "Un **oro inicial**.",
          "Al menos **15 Aliados o 15 Tótems**. Tiene que cumplirlo un tipo solo: 14 y 14 no alcanzan.",
          "Hasta **3 copias** de cada carta, o **1 si es Única**. Los **Oros sin habilidad** y los **Mercenarios** no tienen tope.",
          "Una sola **afinidad** para todos tus Aliados.",
          "Un **side deck** de hasta 10 cartas.",
          "La **Banlist**: sin cartas **baneadas**, y con las cartas que declara Únicas a una copia.",
        ],
      },
      {
        pregunta: "¿Qué significan los lazos «Errata» y «Baneada»?",
        respuesta: [
          "**Errata**: la Fe de Erratas o la Banlist corrigen esa carta. La carta muestra su texto impreso, y el botón **«Errata»** de su detalle muestra el texto arreglado. El constructor juega con el arreglado: si la errata la vuelve **Única**, admite una sola copia.",
          "**Baneada**: la Banlist la prohíbe. Se puede agregar igual, pero la baraja queda **fuera del formato** y lo dicen el constructor, la página de la baraja y la imagen descargada.",
        ],
      },
      {
        pregunta: "¿Puedo elegir otro arte de una carta?",
        respuesta: [
          "Sí. Si la carta tiene más de una impresión, su detalle muestra bajo la imagen la fila **Impresiones**, con sus artes alternativos y reimpresiones. Al pulsar una, el detalle pasa a esa impresión, y en el constructor **«Agregar a la baraja»** agrega la elegida.",
          "Todas las impresiones son la misma carta: cuentan juntas para el tope de copias.",
        ],
      },
      {
        pregunta: "¿Qué tipos de Oro hay?",
        respuesta: [
          "Tres, y cada uno tiene su opción en **Filtros → Tipo**, bajo «Oro» (que los muestra todos):",
        ],
        lista: [
          "**Con habilidad:** cartas como cualquier otra. Hasta **3 copias**, o **1** si es Única.",
          "**Sin habilidad:** los Oros con que se paga todo. **Sin tope** de copias, y cualquiera puede ser el **oro inicial** de la baraja.",
          "**Oro inicial:** los «Oro Inicial» a arte completo, de cada edición y de cada raza (estos, tres por raza en **Adicionales**). Funcionan **igual** que los sin habilidad; están aparte para elegir un oro inicial vistoso.",
        ],
      },
      {
        pregunta: "¿Cómo elijo el oro inicial?",
        respuesta: [
          "En el panel de la baraja, cada **Oro sin habilidad** u **Oro inicial** de la baraja (no del side deck) lleva un **botón con una moneda**: tócalo y ese Oro pasa a ser el inicial. Tiene que ser un Oro del que lleves **una sola copia**.",
        ],
      },
      {
        pregunta: "¿Qué es la afinidad?",
        respuesta: [
          "La forma en que se agrupan tus Aliados. Hay tres, y basta con cumplir **una**:",
        ],
        lista: [
          "**Por raza:** todos tus Aliados de la misma raza.",
          "**Por escuela elemental:** todos de las dos razas de una escuela.",
          "**Por atributo:** todos Luz, o todos Oscuridad.",
        ],
      },
      {
        pregunta: "¿Cómo quito una carta?",
        respuesta: [
          "En el panel de la baraja, con el botón **−** de su fila. También desde el detalle de la carta: tócala en el catálogo del constructor y usa **«Quitar una copia»**.",
        ],
      },
      {
        pregunta: "¿Qué es la curva de coste?",
        respuesta: [
          "Las barras que muestran cuántas cartas llevas de cada **coste**, de 0 a 6 o más. Están en el panel del constructor y al final de la página de la baraja. Sirven para ver de un vistazo si la baraja está cargada de cartas caras. Solo cuentan la baraja, no el side deck, y los **Oros** van aparte porque no tienen coste.",
        ],
      },
      {
        pregunta: "¿Por qué desaparecieron cartas del constructor?",
        respuesta: [
          "Cuando agregas Aliados, el constructor muestra **solo los Aliados que caben** en la afinidad de tu baraja, y te lo avisa sobre las cartas. Talismanes, Armas, Tótems y Oros siguen apareciendo todos. Para cambiar de afinidad, **quita los Aliados** de la baraja.",
          "Si una carta no se puede agregar, por ejemplo porque ya tienes las copias máximas, el constructor **te dice el motivo** en un aviso arriba a la derecha.",
        ],
      },
      {
        pregunta: "¿Cómo armo el side deck?",
        respuesta: [
          "Sobre el catálogo del constructor está la opción **«Agregar a: Baraja / Side deck»**. Elige **Side deck** y las cartas que agregues irán ahí. El side comparte con la baraja el tope de copias y las cartas Únicas.",
        ],
      },
    ],
  },
  {
    titulo: "Guardar y compartir",
    items: [
      {
        pregunta: "¿Cómo guardo una baraja?",
        respuesta: [
          "Ponle un **nombre** y toca **«Guardar baraja»**. Queda en **Mis barajas**, desde donde puedes editarla, duplicarla, compartirla, exportarla o borrarla.",
          "Dos barajas **no pueden llamarse igual**: si el nombre ya existe, el constructor te pide otro. Al duplicar, importar o guardar una baraja compartida con un nombre repetido, se le agrega **«(copia)»**.",
        ],
      },
      {
        pregunta: "¿Se pierde la baraja si salgo del constructor sin guardar?",
        respuesta: [
          "No. Mientras armas, la baraja en curso se guarda sola como **borrador** en tu navegador: si recargas la página, vas a otra sección o cierras la pestaña, al volver al constructor **se retoma donde quedó**, con un aviso arriba del panel.",
          "El aviso tiene **«Descartar»** por si prefieres empezar de cero (o volver a la versión guardada, si estabas editando una). Si abres otra baraja mientras hay un borrador pendiente, el aviso ofrece **«Retomar»** el borrador o descartarlo. Al **guardar**, el borrador se borra.",
          "Hay un solo borrador a la vez: es la baraja que estabas armando, no una lista.",
        ],
      },
      {
        pregunta: "¿Dónde quedan guardadas?",
        respuesta: [
          "En **tu navegador**, en este equipo. No se suben a ningún servidor. Por eso no aparecen en otro navegador ni en otro equipo, y **se pierden si borras los datos del sitio**. Para no perderlas, **expórtalas** a un archivo de vez en cuando.",
        ],
      },
      {
        pregunta: "¿Cómo comparto una baraja?",
        respuesta: [
          "Toca el **botón del enlace**, en Mis barajas o en la página de la baraja, y se copia un enlace. Quien lo abra ve tu baraja completa y puede **guardarla en sus barajas**.",
        ],
      },
      {
        pregunta: "¿Cómo pruebo una mano inicial?",
        respuesta: [
          "Al final de la página de la baraja, en **«Probar una mano»**. **«Robar mano»** saca 8 cartas al azar, sin el oro inicial. **«Mulligan»** vuelve a barajar y roba una carta menos cada vez.",
        ],
      },
      {
        pregunta: "¿Puedo compartir la baraja como imagen?",
        respuesta: [
          "Sí. En la página de la baraja, el **botón de la imagen** descarga un PNG con el nombre, todas las cartas agrupadas por tipo y cuántas copias llevas de cada una. Sirve para redes o para un chat.",
        ],
      },
      {
        pregunta: "¿Cómo paso mis barajas a otro computador?",
        respuesta: [
          "En Mis barajas, **«Exportar todo»** baja un archivo con todas tus barajas. En el otro computador, **«Importar»** las carga. Importar **no borra** las que ya tienes: solo agrega las que quepan, hasta un máximo de **50**.",
        ],
      },
      {
        pregunta: "¿Puedo elegir la imagen de mi baraja?",
        respuesta: [
          "Sí. En la página de la baraja, toca la **estrella** junto a una carta: esa carta queda de **portada**, y es la imagen que acompaña a la baraja en Mis barajas. En el teléfono las estrellas se ven siempre; en el computador aparecen al pasar el cursor sobre la carta.",
        ],
      },
    ],
  },
  {
    titulo: "Las secciones del sitio",
    items: [
      {
        pregunta: "¿Qué hay en cada sección?",
        respuesta: [],
        lista: [
          "**Catálogo:** todas las cartas del formato, con buscador y filtros.",
          "**Constructor:** donde armas y editas una baraja.",
          "**Mis barajas:** las barajas que guardaste en este navegador.",
          "**Documentos:** la **Fe de Erratas** y la **Banlist** del formato. Se pueden leer en el sitio, abrir en PDF o descargar, y el catálogo y el constructor ya las aplican.",
          "**Novedades:** lo que ha cambiado en el sitio, de lo más nuevo a lo más antiguo.",
        ],
      },
      {
        pregunta: "¿Puedo usar el sitio con fondo claro?",
        respuesta: [
          "Sí: el botón del **sol o la luna**, arriba a la derecha, cambia entre el **tema oscuro** y el **claro**. El sitio recuerda tu elección.",
        ],
      },
    ],
  },
];
