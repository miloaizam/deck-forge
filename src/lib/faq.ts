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
          "Para ver el **Catálogo**, los **Documentos**, las **Novedades** y la **Comunidad**, no. Tampoco para abrir una baraja o una colección que te compartan por enlace.",
          "Para **armar barajas** y llevar tu **colección**, sí. Se inicia sesión con **Google** y es **gratis**.",
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
          "El botón de las **flechas**, dentro del buscador, cambia el orden a **nombre de la A a la Z**, luego de la **Z a la A** y de vuelta al de siempre. Está en el catálogo, en el constructor y en tu colección, y **«Limpiar filtros»** también lo vuelve al de siempre. La lista de tu baraja sigue siempre el orden de edición y frecuencia.",
        ],
      },
      {
        pregunta: "¿Puedo compartir una búsqueda?",
        respuesta: [
          "Sí. La búsqueda y los filtros quedan en la **dirección de la página**: copia el enlace y quien lo abra verá las mismas cartas. Por lo mismo, si vas a otra sección y vuelves con **«atrás»**, los filtros siguen puestos.",
        ],
      },
      {
        pregunta: "¿Hay atajos de teclado?",
        respuesta: [
          "La tecla **«/»** lleva al buscador desde cualquier parte del catálogo, del constructor o de tu colección. **Esc** cierra la carta abierta.",
          "En el teléfono, el botón **«atrás»** también cierra la carta, en vez de salir de la página.",
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
        pregunta: "¿Qué significan los colores del estado de la baraja?",
        respuesta: [
          "Sobre la lista de la baraja, una **barra** avanza hacia las 50 cartas y debajo va lo que falta corregir:",
        ],
        lista: [
          "**Verde:** la baraja cumple las reglas del formato.",
          "**Ámbar:** está **incompleta**; cada línea dice qué falta, como el oro inicial o Aliados para llegar a 15.",
          "**Rojo:** lleva una carta **baneada** y queda fuera del formato aunque esté completa.",
        ],
      },
      {
        pregunta: "¿Qué significan los lazos «Errata» y «Baneada»?",
        respuesta: [
          "**Errata**: la Fe de Erratas o la Banlist corrigen esa carta. Su detalle ya muestra el **texto corregido**, con sus keywords, y el constructor juega con él: si la errata la vuelve **Única**, admite una sola copia. El texto impreso en la carta puede decir otra cosa; manda el corregido.",
          "**Baneada**: la Banlist la prohíbe. Se puede agregar igual, pero la baraja queda **fuera del formato** y lo dicen el constructor, la página de la baraja y la imagen descargada.",
        ],
      },
      {
        pregunta: "¿Puedo elegir otro arte de una carta?",
        respuesta: [
          "Sí. Si la carta tiene más de una impresión, su detalle muestra bajo la imagen la fila **Impresiones**, con sus artes alternativos y reimpresiones. Al pulsar una, el detalle pasa a esa impresión, y en el constructor **«Agregar a la baraja»** agrega la elegida.",
          "Si la baraja ya lleva la carta con otro arte, el detalle ofrece **«Usar este arte en la baraja»**, que pasa todas sus copias a la impresión elegida. Las miniaturas marcan cuántas copias llevas de cada una.",
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
          "Con el botón **−** del pie de la carta en el catálogo del constructor, o con el **−** de su fila en el panel de la baraja. También desde el detalle de la carta, con **«Quitar una copia»**.",
          "Para empezar de nuevo, **«Vaciar»** quita todas las cartas de una vez. Antes te pide confirmar, para que no la pierdas por un toque accidental.",
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
          "Ponle un **nombre** y toca **«Guardar baraja»**. Queda en **Mis barajas**: toca su tarjeta para verla, o usa sus botones para editarla, descargarla como imagen, compartirla, duplicarla o borrarla.",
          "Dos barajas **no pueden llamarse igual**: si el nombre ya existe, el constructor te pide otro. Al duplicar o guardar una baraja compartida con un nombre repetido, se le agrega **«(copia)»**.",
          "Si la baraja está **incompleta** o lleva una carta **baneada**, el constructor te muestra qué le falta y pregunta antes de guardar: puedes **«Guardar igual»** y terminarla después. Al guardar cambios en una baraja que ya existía, también pide confirmar, porque reemplaza la versión anterior.",
        ],
      },
      {
        pregunta: "¿Se pierde la baraja si salgo del constructor sin guardar?",
        respuesta: [
          "No. Mientras armas, el sitio recuerda la baraja en curso: si recargas la página, vas a otra sección o cierras la pestaña, al volver al constructor te pregunta **«¿Recuperar baraja sin guardar?»**.",
          "**«Recuperar»** sigue donde quedaste. **«Descartar»** la deja ir: empiezas de cero o, si estabas editando una baraja guardada, vuelve a como estaba. Al **guardar**, la pregunta ya no aparece.",
          "Se recuerda una sola baraja a la vez: la última que estabas armando.",
        ],
      },
      {
        pregunta: "¿Dónde quedan guardadas?",
        respuesta: [
          "En **tu cuenta**. Las ves en cualquier equipo donde inicies sesión.",
          "Si tenías barajas guardadas en el navegador de antes, se pasan a tu cuenta la primera vez que inicias sesión.",
        ],
      },
      {
        pregunta: "¿Cómo comparto una baraja?",
        respuesta: [
          "Toca el **botón del enlace** (la cadena), en la página de la baraja o en su tarjeta de Mis barajas, y se copia un enlace. Quien lo abra ve tu baraja completa y puede **guardarla en sus barajas**.",
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
          "Sí. El **botón de la imagen**, en la página de la baraja o en su tarjeta de Mis barajas, descarga una imagen con el nombre, todas las cartas agrupadas por tipo y cuántas copias llevas de cada una. Sirve para redes o para un chat.",
        ],
      },
      {
        pregunta: "¿Cómo paso mis barajas a otro computador?",
        respuesta: ["Solo **inicia sesión** en el otro computador y ahí estarán."],
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
    titulo: "Mi colección",
    items: [
      {
        pregunta: "¿Para qué sirve la colección?",
        respuesta: [
          "Para llevar dos listas: las cartas que **tienes** y las que **te faltan**, que son las que quieres conseguir. Está en **Colección**, en la barra de arriba.",
        ],
      },
      {
        pregunta: "¿Cómo agrego cartas?",
        respuesta: [
          "En la pestaña **«Agregar cartas»** está todo el catálogo, con el buscador y los filtros. En cada carta:",
        ],
        lista: [
          "**«Tengo»** la pasa a tus cartas. Ahí, el **+** y el **−** cambian las copias.",
          "El **corazón** la anota en las que te faltan, aunque ya tengas alguna copia. En «Me faltan», el **+** y el **−** dicen cuántas copias te faltan: las que quieras.",
        ],
      },
      {
        pregunta: "Tengo una copia y quiero tres, ¿cómo lo anoto?",
        respuesta: [
          "Una carta puede estar en las dos listas: deja **1** en **«Tengo»** y anota **2** en **«Me faltan»**. Cada fila dice lo que hay en la otra lista («te faltan 2», «tienes 1»).",
        ],
      },
      {
        pregunta: "¿Qué pasa cuando consigo una carta que me faltaba?",
        respuesta: [
          "En **«Me faltan»**, toca **«Conseguí una»**: suma una copia en **«Tengo»** y resta una de las que te faltan. Cuando ya no falta ninguna, sale de la lista.",
          "Si sumas copias directamente en **«Tengo»**, también se descuentan de las que te faltan. Para sacar una carta de «Me faltan» sin marcarla como tuya, baja sus copias con el **−** hasta cero.",
        ],
      },
      {
        pregunta: "¿Los artes alternativos cuentan aparte?",
        respuesta: [
          "Sí: cada **impresión** se marca por separado, porque no es lo mismo tener el arte normal que el alternativo. En el detalle de una carta, la fila **Impresiones** marca cuántas copias tienes de cada arte.",
        ],
      },
      {
        pregunta: "¿Puedo compartir mis listas para cambiar cartas?",
        respuesta: ["Sí, de tres formas:"],
        lista: [
          "**«Compartir»** copia un enlace con tus dos listas. Quien lo abra ve lo que tienes y lo que te falta, sin poder cambiarlo, y su propia colección no se toca.",
          "**«Imagen»** descarga una imagen de la lista que estás viendo, «Tengo» o «Me faltan», con los filtros que tengas puestos. Bajo cada carta van su **nombre**, su **edición** y su **frecuencia**, para que quien la vea sepa exactamente cuál es. Si la lista es muy larga, sale en **varias imágenes** para que las cartas se vean bien, y en el teléfono puedes compartirlas todas juntas.",
          "**«Lista»** copia como texto la lista que estás viendo, una carta por línea: las copias, el nombre y, entre paréntesis, la **edición** y la **frecuencia** («3x Akiko Yamamoto (Escuelas Elementales, Mega Real)»). Pégala en **WhatsApp** o donde quieras; los títulos salen en negrita. Si el navegador no deja copiar, se descarga como archivo de texto.",
        ],
      },
      {
        pregunta: "¿Dónde se guarda mi colección?",
        respuesta: [
          "En **tu cuenta**, igual que las barajas: la ves en cualquier equipo donde inicies sesión.",
        ],
      },
    ],
  },
  {
    titulo: "Tu cuenta y la Comunidad",
    items: [
      {
        pregunta: "¿Cómo inicio sesión?",
        respuesta: [
          "Toca el **icono de persona**, arriba a la derecha, y luego **«Iniciar sesión con Google»**. Si es la primera vez, tu cuenta se crea en ese momento.",
          "Tu **nombre y tu correo** no se muestran a nadie. En la Comunidad apareces con el **alias** que elijas.",
        ],
      },
      {
        pregunta: "¿Qué se guarda en la cuenta?",
        respuesta: [
          "Tus **barajas** y tu **colección**. Se sincronizan solas cada vez que guardas, y en **«Tu cuenta»** puedes forzarlo con **«Sincronizar ahora»**.",
          "Lo único que no se guarda en la cuenta es el borrador del constructor: queda en el navegador donde lo dejaste.",
        ],
      },
      {
        pregunta: "¿Qué pasa si cierro sesión?",
        respuesta: [
          "Tus barajas y tu colección **siguen en tu cuenta**. Para volver a usar el constructor, Mis barajas o la colección, inicia sesión de nuevo.",
        ],
      },
      {
        pregunta: "¿Cómo publico una baraja?",
        respuesta: [
          "Abre la baraja desde **Mis barajas** y elige **«Pública»**. La primera vez te pide un **alias**. Solo se pueden publicar barajas **legales**; si la editas y deja de serlo, se quita de la Comunidad.",
          "Para quitarla, elige **«Privada»**. En Mis barajas, las públicas llevan la etiqueta **«Pública»** con sus likes.",
        ],
      },
      {
        pregunta: "¿Cómo funciona la Comunidad?",
        respuesta: [
          "Ahí están las barajas que publicaron otros jugadores. Puedes ordenarlas por **más likes**, **tendencia** (likes de los últimos 7 días), **más recientes** o **más copiadas**, y filtrarlas por raza, escuela o atributo.",
          "Con tu cuenta puedes darles **like**, **guardarlas en tus barajas** o **reportarlas** con la bandera si tienen algo ofensivo o son spam.",
        ],
      },
      {
        pregunta: "Mi baraja dice «Oculta por moderación»",
        respuesta: [
          "Alguien la reportó y se quitó de la Comunidad. La baraja sigue en Mis barajas; solo dejó de verse en público.",
        ],
      },
      {
        pregunta: "¿Cómo borro mi cuenta?",
        respuesta: [
          "En **«Tu cuenta»**, con **«Borrar mi cuenta»**. Se borran al instante tu cuenta, tus barajas, tu colección y tus likes. Más detalles en **Políticas de privacidad**, al pie de cada página.",
        ],
      },
    ],
  },
  {
    titulo: "Las secciones del sitio",
    items: [
      {
        pregunta: "¿Qué hay en cada sección?",
        respuesta: [
          "**Constructor**, **Mis barajas** y **Colección** aparecen en la barra de arriba cuando inicias sesión.",
        ],
        lista: [
          "**Catálogo:** todas las cartas del formato, con buscador y filtros.",
          "**Constructor:** donde armas y editas una baraja.",
          "**Mis barajas:** las barajas que guardaste.",
          "**Colección:** las cartas que tienes y las que te faltan.",
          "**Comunidad:** las barajas que otros jugadores publicaron.",
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
