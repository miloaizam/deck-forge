/**
 * Novedades del sitio, para quien lo usa: la pagina /novedades las pinta como
 * una linea de tiempo.
 *
 * Solo entra lo que al usuario le cambia algo al usar DeckForge, contado en su
 * idioma y sin tecnicismos: "se puede armar una baraja Luz", no "deckStats
 * filtra por tipo". Seguridad interna, herramientas de desarrollo, refactors y
 * documentacion NO van aqui.
 *
 * Al agregar algo que el usuario note, se suma su entrada en el mismo commit.
 * La fecha es la del commit (git log), de la mas nueva a la mas antigua; lo
 * comprueba novedades.test.ts. Texto plano: nada de HTML.
 */

export const TIPOS_NOVEDAD = ["Novedad", "Mejora", "Arreglo", "Aviso"] as const;
export type TipoNovedad = (typeof TIPOS_NOVEDAD)[number];

export interface Novedad {
  /** AAAA-MM-DD. */
  fecha: string;
  tipo: TipoNovedad;
  titulo: string;
  /**
   * Version del sitio, estimada hacia atras desde la primera (0.1.0). Sube el
   * primer numero con los cambios grandes (el constructor, las diez ediciones,
   * las erratas aplicadas, la coleccion), el segundo con cada novedad o mejora
   * y el tercero con los arreglos y avisos. Lo comprueba novedades.test.ts.
   */
  version: string;
  /** Un string por parrafo. */
  texto: string[];
}

export const NOVEDADES: Novedad[] = [
  {
    fecha: "2026-10-22",
    version: "5.1.0",
    tipo: "Mejora",
    titulo: "Tus barajas, siempre en tu cuenta",
    texto: [
      "El constructor, Mis barajas y la colección ahora piden entrar con Google. Así tus barajas y tu colección quedan siempre guardadas en tu cuenta y no se pierden si cambias de equipo o borras los datos del navegador.",
      "Lo que ya tenías guardado en el navegador no se pierde: se suma a tu cuenta la primera vez que entras. El catálogo, los documentos, la Comunidad y los enlaces que te compartan se siguen viendo sin cuenta.",
      "Y en la barra de arriba, la sección donde estás ahora va subrayada.",
    ],
  },
  {
    fecha: "2026-10-22",
    version: "5.0.0",
    tipo: "Novedad",
    titulo: "Cuentas y Comunidad",
    texto: [
      "Ahora puedes entrar con tu cuenta de Google, si quieres: tus barajas y tu colección se guardan también en la nube y aparecen en cualquier equipo donde entres. Sin cuenta, todo sigue funcionando como antes, en tu navegador.",
      "Y llega la Comunidad: publica tus barajas, mira las de otros jugadores y dales like. Se ordenan por más likes, tendencia de la semana, más recientes o más copiadas, y se pueden guardar en tus barajas con un toque.",
      "Qué se guarda y quién lo ve está en la nueva página de Privacidad, al pie de cada página.",
    ],
  },
  {
    fecha: "2026-10-21",
    version: "4.13.0",
    tipo: "Novedad",
    titulo: "La carta del detalle en 3D",
    texto: [
      "Al abrir una carta, la imagen se inclina siguiendo el cursor, con un reflejo de luz que se mueve sobre ella, y vuelve a su sitio al salir. En el teléfono, toca la carta y arrastra el dedo hacia los lados.",
      "Si tu sistema tiene activado «reducir movimiento», la carta se queda quieta.",
    ],
  },
  {
    fecha: "2026-10-21",
    version: "4.12.1",
    tipo: "Arreglo",
    titulo: "Krisna y Anubis de Inpu ya no son Errante",
    texto: [
      "La Banlist las vuelve Únicas, y una carta Única no puede tener dos copias en mesa: Errante sobraba. Ahora muestran solo Única, y el filtro de habilidad ya no las ofrece como Errante.",
    ],
  },
  {
    fecha: "2026-10-21",
    version: "4.12.0",
    tipo: "Mejora",
    titulo: "Más rápido en el teléfono y avisos más claros en el tema claro",
    texto: [
      "El catálogo y el constructor muestran sus cartas antes: el fundido entre páginas queda solo para cuando navegas desde la barra de arriba, y la ayuda se descarga recién cuando la abres.",
      "Si todavía no tienes barajas, Mis barajas te lo dice apenas abre, sin pasar por la silueta de carga.",
      "En el tema claro, «Incompleta» y los avisos en ámbar se ven ámbar, y no rosados. En el detalle de una baraja, el número de cartas va bajo su nombre.",
    ],
  },
  {
    fecha: "2026-10-21",
    version: "4.11.0",
    tipo: "Mejora",
    titulo: "Cambios de página suaves y un sitio más liviano",
    texto: [
      "Al pasar de una página a otra, la nueva aparece con un fundido corto en vez de cambiar de golpe; la barra de arriba se queda quieta. Si tu sistema tiene activado «reducir movimiento», el cambio sigue siendo instantáneo.",
      "El catálogo, el constructor, tu colección y tus barajas descargan menos código y lo procesan por partes, así que en el teléfono responden antes.",
      "En el constructor, el buscador ocupa todo el ancho de la columna, y en Mis barajas y en la colección las tarjetas se acomodan mejor según el espacio que tienen.",
    ],
  },
  {
    fecha: "2026-10-21",
    version: "4.10.1",
    tipo: "Arreglo",
    titulo: "Guardar siempre a mano en el teléfono",
    texto: [
      "En el panel de la baraja del teléfono, «Guardar baraja» y «Vaciar la baraja» quedan fijos abajo: ya no hay que recorrer toda la lista de cartas para guardar.",
      "En tabletas y pantallas de 1024 px, el panel de la baraja deja más espacio a las cartas y la barra de arriba ya no queda pegada al borde.",
    ],
  },
  {
    fecha: "2026-10-21",
    version: "4.10.0",
    tipo: "Mejora",
    titulo: "El catálogo y el constructor cargan más rápido",
    texto: [
      "Las páginas del catálogo, el constructor, tu colección y tus barajas pesan ahora una fracción de lo que pesaban: las cartas se descargan una sola vez y se reutilizan mientras navegas. En el teléfono la página aparece en la mitad del tiempo.",
      "Si tocas el + de una carta mientras el catálogo termina de llegar, la carta se agrega igual en cuanto está listo.",
    ],
  },
  {
    fecha: "2026-10-21",
    version: "4.9.0",
    tipo: "Novedad",
    titulo: "Tu colección como lista de texto",
    texto: [
      "En Colección, el botón «Lista» copia la lista que estás viendo («Tengo» o «Me faltan», con tus filtros) como texto: una carta por línea, con sus copias y, entre paréntesis, la edición y la frecuencia. Lista para pegar en WhatsApp.",
    ],
  },
  {
    fecha: "2026-10-20",
    version: "4.8.1",
    tipo: "Arreglo",
    titulo: "La portada de tus barajas ya no se ve cortada",
    texto: [
      "En Mis barajas, la carta de portada se recortaba por los costados cuando la tarjeta tenía nota o los botones ocupaban dos filas. Ahora se ve entera en cualquier pantalla.",
      "En el teléfono, las tarjetas ya no se salen de la pantalla, y el nombre de la baraja se lee completo: el estado (Legal, Incompleta) pasa bajo el texto cuando no cabe al lado.",
    ],
  },
  {
    fecha: "2026-10-19",
    version: "4.8.0",
    tipo: "Mejora",
    titulo: "Nuevo orden de las frecuencias",
    texto: [
      "Dentro de cada edición, las cartas van ahora en este orden: Legendaria, Ultra Real, Mega Real, Promocional, Milenaria, Real, Cortesano, Vasallo y Oro. Es el mismo en el catálogo, el filtro de frecuencia, el constructor, tus barajas, la colección y las imágenes que descargas.",
    ],
  },
  {
    fecha: "2026-10-18",
    version: "4.7.1",
    tipo: "Arreglo",
    titulo: "La imagen de una colección grande ya no se ve borrosa",
    texto: [
      "Con muchas cartas, la imagen de «Tengo» o «Me faltan» las achicaba hasta que no se leían. Ahora las cartas mantienen su tamaño y, si no caben en una, la lista sale en varias imágenes («Parte 1 de 3», «Parte 2 de 3»…). En el teléfono puedes compartirlas todas juntas.",
      "Las imágenes de barajas y colecciones también pesan mucho menos (se descargan en JPG), así que se mandan sin problema por WhatsApp.",
    ],
  },
  {
    fecha: "2026-10-18",
    version: "4.7.0",
    tipo: "Novedad",
    titulo: "Nuevo arte de Mariamman",
    texto: [
      "Llega a Arte Alternativo la Mariamman del Kit Eterno de Colecciones Raciales 2021, con su ilustración a arte completo. Se elige desde el detalle de la carta, en «Impresiones», y cuenta como Mariamman en la baraja.",
    ],
  },
  {
    fecha: "2026-10-18",
    version: "4.6.0",
    tipo: "Mejora",
    titulo: "Una carta puede estar en «Tengo» y en «Me faltan»",
    texto: [
      "Si tienes una copia y quieres tres, ahora puedes anotarlo: deja una en «Tengo» y dos en «Me faltan». Cada fila te recuerda lo que hay en la otra lista.",
      "Al conseguir una, toca «Conseguí una» en «Me faltan»: pasa una copia a «Tengo» y descuenta una de las que te faltan. Sumar copias en «Tengo» también las descuenta.",
    ],
  },
  {
    fecha: "2026-10-16",
    version: "4.5.0",
    tipo: "Mejora",
    titulo: "Botones iguales en todo el sitio",
    texto: [
      "Los botones del mismo tipo se ven y responden igual en todas las páginas: el violeta para la acción principal, el de contorno para el resto, y rojo o ámbar al pasar el cursor por lo que borra o descarta.",
      "En el teléfono, los botones chicos de las tarjetas de Mis barajas, de las filas de la colección y del aviso para recuperar una baraja son más fáciles de tocar. Y el corazón de «Me falta» ahora es violeta: el rojo queda para lo que se borra.",
      "El sitio se lee mejor con lector de pantalla y con el teclado: las cartas de «Probar una mano» muestran dónde está el foco y los textos de algunos avisos tienen más contraste en el tema claro.",
    ],
  },
  {
    fecha: "2026-10-15",
    version: "4.4.1",
    tipo: "Arreglo",
    titulo: "Tres artes alternativos menos y botones más visibles",
    texto: [
      "Leviatán de Furia, Mandoble de la extensión de Furia y Nothung de Midgard salen de Arte Alternativo: se habían colado por error. Si los tenías en una baraja o en tu colección, pasan solos al arte de la misma carta que ya estaba.",
      "Los botones del aviso para recuperar una baraja y la moneda para elegir el oro inicial se ven mejor. Y todo lo que se puede pulsar —cartas, botones, filtros, tarjetas— se marca igual al pasar el cursor: con un contorno violeta, o rojo en lo que borra.",
    ],
  },
  {
    fecha: "2026-10-15",
    tipo: "Mejora",
    titulo: "Recupera tu baraja y comparte mejor tu colección",
    version: "4.4.0",
    texto: [
      "Si dejaste una baraja a medio armar, al volver al constructor el sitio pregunta «¿Recuperar baraja sin guardar?»: «Recuperar» sigue donde quedaste y «Descartar» la deja ir.",
      "En Mis barajas, toca cualquier parte de la tarjeta para abrir la baraja. En la página de la baraja, la carta bajo el cursor se marca con un contorno de color.",
      "La imagen de tu colección muestra bajo cada carta su nombre, su edición y su frecuencia, para que quien la vea sepa exactamente cuál es. Y en «Me faltan» puedes anotar todas las copias que quieras.",
    ],
  },
  {
    fecha: "2026-10-15",
    tipo: "Mejora",
    titulo: "Barajas, colección y avisos más claros",
    version: "4.3.0",
    texto: [
      "El constructor pregunta antes de vaciar la baraja, antes de guardar cambios en una baraja que ya existía y antes de guardar una baraja incompleta o con cartas baneadas, mostrando lo que le falta.",
      "El estado de la baraja va de un solo color: verde si cumple, ámbar si le falta algo y rojo si está fuera del formato, con la barra y la lista del mismo tono. Los botones que borran o vacían se ponen rojos al pasar el cursor.",
      "Para ordenar por nombre, de la A a la Z o al revés, está el botón de las flechas dentro del buscador del catálogo, del constructor y de la colección.",
      "En Mis barajas, cada baraja descarga su imagen desde la tarjeta. En la colección, «Compartir» copia un enlace con lo que tienes y lo que te falta, e «Imagen» descarga la lista que estás viendo.",
    ],
  },
  {
    fecha: "2026-10-07",
    tipo: "Arreglo",
    titulo: "La imagen de la baraja, completa en el teléfono",
    version: "4.2.1",
    texto: [
      "Al descargar la imagen de una baraja desde el teléfono, algunas cartas salían como un hueco gris. Ahora la imagen sale completa, aunque la conexión sea lenta.",
    ],
  },
  {
    fecha: "2026-10-05",
    tipo: "Mejora",
    titulo: "Ordena el catálogo",
    version: "4.2.0",
    texto: [
      "El botón «Ordenar», junto a los filtros del catálogo, ordena las cartas por nombre, por coste o por Fuerza. El orden se guarda en el enlace, igual que los filtros.",
      "La portada suma dos accesos directos bajo «Entrar a la forja»: al catálogo y al constructor.",
    ],
  },
  {
    fecha: "2026-10-05",
    tipo: "Mejora",
    titulo: "Erratas dentro de la carta",
    version: "4.1.0",
    texto: [
      "Las cartas con errata muestran directamente el texto corregido por la Fe de Erratas y la Banlist, con sus keywords: ya no hay que abrir un panel aparte. El lazo «Errata» de la imagen sigue avisando que el texto no es el impreso, y el buscador y los filtros encuentran las cartas por el texto corregido.",
    ],
  },
  {
    fecha: "2026-10-05",
    tipo: "Novedad",
    titulo: "Tu colección",
    version: "4.0.0",
    texto: [
      "Nueva sección «Colección», junto a Mis barajas, con dos listas: las cartas que tienes, con sus copias, y las que te faltan para conseguir. Se agregan desde «Agregar cartas», que tiene el buscador y los filtros del catálogo.",
      "«Copiar lista» copia cualquiera de las dos como texto, para negociar cambios por chat, y la colección se exporta e importa con un archivo como las barajas.",
    ],
  },
  {
    fecha: "2026-10-05",
    tipo: "Mejora",
    titulo: "Un constructor más cómodo",
    version: "3.4.0",
    texto: [
      "Cada carta del constructor lleva al pie su contador con − y +: se suman y se quitan copias sin abrirla, y ya no tapan el coste, la Fuerza ni el lazo de errata.",
      "Si la baraja lleva una carta con un arte y eliges otro en su detalle, «Usar este arte en la baraja» cambia todas sus copias de una vez.",
      "El estado de la baraja se ve mejor: una barra hacia las 50 cartas, en ámbar lo que falta y en rojo las cartas baneadas. En Mis barajas, cada baraja lleva su pastilla «Legal», «Incompleta» o «Con baneada».",
      "El detalle de una baraja copia su lista en texto («3 Akiko Yamamoto…») para pegarla en Discord o WhatsApp.",
      "El catálogo recuerda la búsqueda y los filtros al ir y volver, y se pueden compartir con el enlace. La tecla «/» lleva al buscador, y el botón «atrás» del teléfono cierra la carta abierta en vez de salir de la página.",
    ],
  },
  {
    fecha: "2026-10-04",
    tipo: "Mejora",
    titulo: "Erratas más cortas",
    version: "3.3.0",
    texto: [
      "El botón «Errata» de cada carta muestra solo lo que cambia, en una sola errata que junta la Fe de Erratas y la Banlist, sin repetir lo que dicen las dos.",
    ],
  },
  {
    fecha: "2026-10-04",
    tipo: "Mejora",
    titulo: "Cartas más nítidas",
    version: "3.2.0",
    texto: [
      "En pantallas de alta densidad, como la de la mayoría de los notebooks y teléfonos, la grilla muestra las cartas con la imagen grande y ya no se ven borrosas.",
      "Las cartas de Pack América, Dante, Gólem de Praga y la extensión de Escuelas Elementales ya no tienen esquinas blancas ni un marco distinto al del resto.",
    ],
  },
  {
    fecha: "2026-10-04",
    tipo: "Novedad",
    titulo: "Elige el arte de cada carta",
    version: "3.1.0",
    texto: [
      "El detalle de una carta muestra todas sus impresiones bajo la imagen: artes alternativos y reimpresiones. Al elegir una, el detalle pasa a esa impresión, y en el constructor se agrega a la baraja la que elegiste.",
      "La Banlist queda más corta, en la página y en el PDF: solo las prohibidas, las Únicas y las erratas.",
    ],
  },
  {
    fecha: "2026-10-04",
    tipo: "Novedad",
    titulo: "La Fe de Erratas y la Banlist, aplicadas",
    version: "3.0.0",
    texto: [
      "Las cartas con errata llevan un lazo «Errata» en la esquina, y en su detalle el botón «Errata» muestra el texto arreglado. Las cartas siguen mostrando su texto impreso.",
      "El constructor ya juega con las erratas: las cartas que la Banlist declara Únicas admiten una sola copia, y con Shingas en la baraja Karna también.",
      "Las cartas baneadas llevan el lazo «Baneada». Se pueden agregar, pero la baraja queda fuera del formato y lo dicen el constructor, la página de la baraja y la imagen descargada.",
    ],
  },
  {
    fecha: "2026-10-04",
    tipo: "Novedad",
    titulo: "415 artes alternativos para elegir",
    version: "2.20.0",
    texto: [
      "Arte Alternativo suma 415 impresiones de veinte ediciones del juego, de Furia a Conjuros: las de 20 años, Milenarias, promos y Legendarias de cartas que ya están en el catálogo. Van agrupadas por la edición de donde sale cada arte, de la más nueva a la más vieja, y al abrir una carta se ve de cuál viene.",
      "Son la misma carta con otro dibujo: dicen lo mismo, cuestan lo mismo y cuentan juntas para el máximo de copias. Lo único propio de cada una es su frecuencia y su ilustrador.",
    ],
  },
  {
    fecha: "2026-10-04",
    tipo: "Novedad",
    titulo: "Adicionales y Arte Alternativo",
    version: "2.19.0",
    texto: [
      "Las cartas que no son de las diez ediciones se juntan en dos ediciones nuevas, cada una con su página. Adicionales tiene las de los packs especiales del formato, las nueve que la Banlist pone en observación (llegan Wotan y Járnvid) y los oros iniciales de raza de Dinastía del Dragón, tres por raza, que en el filtro Tipo salen junto a los de edición, en «Oro inicial». Camelot, Templarios, Kemet y Dharma dejan de ser ediciones del catálogo.",
      "Arte Alternativo reúne otras impresiones de cartas que ya están, para que elijas con qué arte llevas cada una: cuentan como la misma carta. Por ahora son la promo de Sarras y las Milenarias de Lambton Worm, Dama Dragón y Guadaña Dragón; vienen más.",
      "Tus barajas guardadas y los enlaces que ya compartiste siguen abriéndose con todas sus cartas.",
    ],
  },
  {
    fecha: "2026-09-29",
    tipo: "Novedad",
    titulo: "Diez cartas más, y tres ediciones nuevas en el filtro",
    version: "2.18.0",
    texto: [
      "Llegan las cartas que la Banlist pone en observación: Wyvern Dorado (Camelot), Melusina (Templarios), Anubis de Inpu y Mut (Kemet), y Bibi Dalair Kaur, Ráksasa Sombrío y Muhammad bin Qasim (Dharma). Van con su texto impreso: las condiciones de la Banlist todavía no se aplican.",
      "Templarios suma además las Milenarias de Lambton Worm, Dama Dragón y Guadaña Dragón, y la promo de Sarras pasa a Camelot. Wotan y Jarnvid quedan fuera por ahora.",
    ],
  },
  {
    fecha: "2026-09-29",
    tipo: "Novedad",
    titulo: "Las cartas de los packs, en su edición",
    version: "2.17.0",
    texto: [
      "Las cartas de los packs especiales ya no tienen edición propia en el filtro. Las del Pack Batalla están en Dominio; Devastador, Dragón de Magma, Balaur y Ataque de Dragón, en ContraAtaque; y Lou Carcolh, Lambton Worm, Dama Dragón, Tugarín, Kyrenia, Nube Incendiaria y Guadaña Dragón, en una edición nueva: Templarios.",
      "Llegan además Árbol del Grito y la promo de Sarras, las dos en Templarios, y con eso están todas las cartas de los packs del formato. Ojo: Nube Incendiaria cuesta 2 en su impresión de Pack América.",
      "Las barajas que ya llevaban alguna de estas cartas no pierden nada: se leen igual, guardadas o compartidas por enlace.",
    ],
  },
  {
    fecha: "2026-09-27",
    tipo: "Arreglo",
    titulo: "Arreglos al guardar, importar y agregar cartas",
    version: "2.16.1",
    texto: [
      "Guardar varias veces una baraja compartida ya no crea copias repetidas: la segunda vez avisa que ya está en Mis barajas. Y un archivo de respaldo dañado ya no puede dejar vacía la lista de barajas.",
      "En el constructor, pulsar el + de una carta que no se puede agregar ahora dice por qué, también en el teléfono, donde antes no pasaba nada.",
      "Kotengu, Tomoe, Punzón de Hueso, Adapa y Nammu tenían impresiones que decían cosas distintas. Ahora todas sus impresiones llevan el mismo texto, así que la carta funciona igual la lleves con el arte que la lleves.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "22 cartas nuevas: las de los packs especiales del formato",
    version: "2.16.0",
    texto: [
      "El catálogo suma las cartas que traen el Pack Batalla y el Pack América y que no están en ninguna de las diez ediciones, como Tiamat, Thor el Poderoso, Lahmu, Dante o Devastador. Salen con el arte de su pack, y en el filtro de edición se encuentran por el nombre del pack.",
      'Ocho cartas de Pack América y Árbol del Grito de Dominio de Tótems llegarán cuando consigamos la imagen de su impresión. El buscador ahora exige todas las palabras: "Thor el Poderoso" encuentra a Thor y no a cada carta que diga "el".',
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Tres tipos de Oro, y un filtro para cada uno",
    version: "2.15.0",
    texto: [
      "El catálogo y el constructor distinguen ahora los Oros con habilidad, los sin habilidad y los Oros iniciales de edición: las cartas «Oro Inicial» de cada edición, a arte completo, marcadas en la grilla.",
      "Se filtran desde el filtro Tipo, donde aparecen bajo «Oro». Los iniciales de edición funcionan igual que los sin habilidad: sirven de oro inicial de la baraja y no tienen tope de copias.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "La baraja en curso ya no se pierde",
    version: "2.14.0",
    texto: [
      "El constructor guarda solo un borrador de la baraja que estás armando. Si recargas la página, cambias de sección o cierras la pestaña, al volver se retoma donde quedó.",
      "Un aviso sobre el panel lo indica y permite descartar el borrador. Al guardar la baraja, el borrador se borra.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "La Fe de Erratas y la Banlist, en Documentos",
    version: "2.13.0",
    texto: [
      "La sección Documentos ya tiene la Fe de Erratas y la Banlist Estándar, transcritas con el estilo de DeckForge. Se pueden leer en el sitio, con el cambio de cada carta resaltado, o abrir y descargar en PDF.",
      "Por ahora son de consulta: el catálogo y el constructor todavía no las aplican.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Ninguna baraja se pierde al llegar a 50",
    version: "2.12.2",
    texto: [
      "Con 50 barajas guardadas, crear, duplicar o guardar otra borraba en silencio la más antigua. Ahora no se guarda y un aviso explica que se llegó al máximo: basta eliminar alguna para hacer espacio.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "La estrella de portada, también en el teléfono",
    version: "2.12.1",
    texto: [
      "En la página de una baraja, la estrella para elegir la carta de portada solo aparecía al pasar el cursor, así que en una pantalla táctil no se veía. Ahora en el teléfono y la tableta se ve siempre.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Novedades más cortas de recorrer",
    version: "2.12.0",
    texto: [
      "Esta página muestra ahora las novedades de a seis. El botón «Ver más», al final, carga las seis siguientes.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Prueba manos y descarga tu baraja como imagen",
    version: "2.11.0",
    texto: [
      "Al final de la página de cada baraja puedes robar una mano inicial de 8 cartas al azar, sin el oro inicial, y hacer mulligan: cada uno vuelve a barajar y roba una carta menos. Al lado está la curva de coste.",
      "Un botón nuevo en la página de la baraja la descarga como imagen, con todas sus cartas y copias, lista para compartir en redes o en un chat.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Nombres de baraja únicos y más largos",
    version: "2.10.0",
    texto: [
      "Dos barajas ya no pueden llamarse igual. Si importas, duplicas o guardas una compartida con un nombre que ya tienes, se le agrega «(copia)».",
      "El nombre de una baraja admite ahora hasta 60 caracteres y la descripción hasta 280.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Los Mercenarios ya admiten cualquier cantidad de copias",
    version: "2.9.3",
    texto: [
      "Grifo Dorado, Pincoya y Dodu son Mercenarios, y su habilidad permite llevar todas las copias que quieras. El constructor los limitaba a tres por error; ahora no tienen tope.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Quitar cartas desde su detalle y copias bien contadas",
    version: "2.9.2",
    texto: [
      "En el constructor, el detalle de una carta ahora tiene «Quitar una copia», además de agregar.",
      "Con tres copias de una carta, el aviso decía que la baraja tenía cuatro. Ahora dice las que lleva de verdad.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Aviso",
    titulo: "Erratas ahora se llama Documentos",
    version: "2.9.1",
    texto: [
      "La sección cambia de nombre y de dirección, de /erratas/ a /documentos/, porque ahí estarán los documentos oficiales para leer y descargar: la Fe de Erratas y la Banlist. Si la tenías guardada, actualiza el enlace.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Curva de coste en el constructor",
    version: "2.9.0",
    texto: [
      "El panel de la baraja muestra cuántas cartas llevas de cada coste, en barras que se mueven a medida que agregas o quitas cartas. Así se ve de un vistazo si la baraja está cargada de cartas caras. La página de cada baraja también la muestra.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Avisos al copiar, exportar, guardar y borrar",
    version: "2.8.0",
    texto: [
      "Ahora todo lo importante se confirma con un mensaje arriba a la derecha: enlace copiado, baraja exportada, creada, guardada, duplicada o eliminada. Antes, exportar una baraja o borrarla desde su página no decía nada.",
      "Cada mensaje lleva un color según lo que pasó: verde lo que se creó o guardó, rojo lo que se eliminó, violeta lo que se copió o exportó y ámbar lo que no se pudo hacer.",
      "Los motivos por los que una carta no entra en la baraja salen en el mismo lugar. Si dejas el cursor encima, el aviso espera a que termines de leerlo.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Todo se abre y se cierra con suavidad",
    version: "2.7.0",
    texto: [
      "El detalle de una carta, la ayuda, los filtros, el menú del teléfono y la hoja de la baraja ya no aparecen de golpe: entran y salen con una animación corta. El panel de la baraja crece y se encoge con suavidad al agregar o quitar cartas. Si tu equipo tiene activado «reducir movimiento», se respeta y no hay animaciones.",
      "Mientras una página o una carta carga, se ve su forma en gris en vez de un hueco vacío.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Aviso",
    titulo: "Los mazos ahora se llaman barajas",
    version: "2.6.1",
    texto: [
      "Así se dice en el juego, y el sitio ahora lo dice igual en todas partes. Las direcciones también cambiaron: Mis mazos pasó a Mis barajas y el Builder, a Constructor.",
      "Si compartiste una baraja antes de este cambio, ese enlace apunta a /mazo/ y ya no abre. Para tener uno nuevo: si la baraja está guardada en tu navegador, ábrela en Mis barajas y vuelve a copiar el enlace. Si solo tienes el enlace viejo, cambia /mazo/ por /baraja/ en la dirección: la baraja se abre y desde ahí puedes guardarla o compartirla de nuevo.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Ayuda y novedades",
    version: "2.6.0",
    texto: [
      "El signo de pregunta de la barra de arriba abre las preguntas frecuentes: cómo guardar, compartir y armar una baraja. Y esta página cuenta lo que va cambiando en el sitio.",
      "En las páginas largas, un botón abajo a la derecha te sube al principio de una vez.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Enlaces más cortos para compartir",
    version: "2.5.0",
    texto: [
      "El enlace de una baraja mide ahora cerca de la mitad, así se pega mejor en un chat.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "El logotipo al compartir un enlace",
    version: "2.4.0",
    texto: [
      "Al pegar un enlace de DeckForge en WhatsApp o Discord, la vista previa muestra el logotipo del sitio.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Filtros más fáciles de recorrer",
    version: "2.3.0",
    texto: [
      "El filtro de edición empieza por la más nueva, Escuelas Elementales, y termina en Bushido. Tipo, raza, escuela elemental y habilidad van en orden alfabético.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Importar ya no reemplaza tus barajas",
    version: "2.2.2",
    texto: [
      "Un archivo con muchas barajas podía desplazar a las que ya tenías guardadas. Ahora solo entran las que caben, hasta el máximo de 50, y el aviso te dice cuántas quedaron fuera.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Las cartas de la baraja ya no saltan de lugar",
    version: "2.2.1",
    texto: [
      "Al subir o bajar las copias de una carta, su fila se queda donde estaba: la baraja se ordena igual que el catálogo.",
    ],
  },
  {
    fecha: "2026-09-19",
    tipo: "Mejora",
    titulo: "Catálogo revisado carta por carta",
    version: "2.2.0",
    texto: [
      "Se comparó el texto, el coste, la fuerza y el ilustrador de todo el catálogo con el arte de cada carta, y se corrigieron 90.",
    ],
  },
  {
    fecha: "2026-09-19",
    tipo: "Novedad",
    titulo: "La extensión de Escuelas Elementales",
    version: "2.1.0",
    texto: [
      "Llegan las 11 cartas de la extensión que salió en los sobres de Despertar Gótico, con Visnu, Krisna y Harionna entre ellas.",
    ],
  },
  {
    fecha: "2026-09-16",
    tipo: "Novedad",
    titulo: "Escuelas Elementales, la edición que da nombre al formato",
    version: "2.0.0",
    texto: [
      "Con ella están las diez ediciones del formato en el catálogo.",
      "Escuelas Elementales cambió el texto de varias cartas que ya existían, y el catálogo muestra siempre el vigente. Algunas ganaron Única o Errante: si tenías tres copias de una de ellas, el constructor te avisará que tu baraja ya no es legal.",
    ],
  },
  {
    fecha: "2026-09-16",
    tipo: "Arreglo",
    titulo: "El filtro de habilidad muestra lo que corresponde",
    version: "1.6.1",
    texto: [
      "Una carta salía al filtrar por una habilidad aunque solo la mencionara, como una que les da Furia a tus Aliados. Ahora solo salen las que tienen esa habilidad.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Novedad",
    titulo: "Barajas Luz y Oscuridad",
    version: "1.6.0",
    texto: [
      "Con Steampunk llega el atributo. Además de armar por raza o por escuela elemental, ahora puedes armar una baraja con todos sus Aliados Luz, o todos Oscuridad.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Novedad",
    titulo: "Cinco ediciones más",
    version: "1.5.0",
    texto: [
      "Águila Imperial, Steampunk, Axis Mundi, Hijos del Sol y Legado Gótico entran al catálogo.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Novedad",
    titulo: "Side deck, portada y nota",
    version: "1.4.0",
    texto: [
      "Tus barajas pueden llevar un side deck de hasta 10 cartas, que se arma desde el mismo constructor. También puedes elegir la carta que la representa en Mis barajas y escribirle una nota corta.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Arreglo",
    titulo: "La regla de los 15 Aliados o Tótems",
    version: "1.3.1",
    texto: [
      "El mínimo lo tiene que cumplir un tipo solo: 15 Aliados, o 15 Tótems. Antes el constructor sumaba los dos y daba por buena una baraja que no lo era.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Mejora",
    titulo: "El catálogo, ordenado por frecuencia",
    version: "1.3.0",
    texto: [
      "Dentro de cada edición, las cartas van de la frecuencia más rara a la más común.",
    ],
  },
  {
    fecha: "2026-09-14",
    tipo: "Novedad",
    titulo: "Dominio y ContraAtaque",
    version: "1.2.0",
    texto: ["Dos ediciones más en el catálogo, revisadas contra el arte de cada carta."],
  },
  {
    fecha: "2026-08-29",
    tipo: "Arreglo",
    titulo: "Los Oros sin habilidad no tienen tope",
    version: "1.1.1",
    texto: [
      "Puedes llevar todas las copias que quieras de un Oro sin habilidad; el constructor ya no los limita a 3.",
    ],
  },
  {
    fecha: "2026-08-29",
    tipo: "Novedad",
    titulo: "Mis barajas y compartir por enlace",
    version: "1.1.0",
    texto: [
      "Guarda tus barajas en tu navegador, míralas en Mis barajas y compártelas con un enlace. También puedes exportarlas a un archivo e importarlas en otro computador.",
    ],
  },
  {
    fecha: "2026-08-29",
    tipo: "Novedad",
    titulo: "Llega el constructor de barajas",
    version: "1.0.0",
    texto: [
      "Arma tu baraja desde el catálogo, y el constructor te va diciendo qué le falta para ser legal: las 50 cartas, el oro inicial, las copias de cada carta y la afinidad.",
    ],
  },
  {
    fecha: "2026-08-28",
    tipo: "Novedad",
    titulo: "Abre DeckForge",
    version: "0.1.0",
    texto: [
      "El catálogo de cartas de Bushido y Sol Naciente, con buscador y filtros, y el tema claro u oscuro para verlo como prefieras.",
    ],
  },
];
