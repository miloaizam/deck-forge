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
  /** Un string por parrafo. */
  texto: string[];
}

export const NOVEDADES: Novedad[] = [
  {
    fecha: "2026-10-04",
    tipo: "Novedad",
    titulo: "Adicionales y Arte Alternativo",
    texto: [
      "Las cartas que no son de las diez ediciones se juntan en dos ediciones nuevas, cada una con su página. Adicionales tiene las de los packs especiales del formato, las nueve que la Banlist pone en observación (llegan Wotan y Járnvid) y los oros iniciales de raza de Dinastía del Dragón, tres por raza. Camelot, Templarios, Kemet y Dharma dejan de ser ediciones del catálogo.",
      "Arte Alternativo reúne otras impresiones de cartas que ya están, para que elijas con qué arte llevas cada una: cuentan como la misma carta. Por ahora son la promo de Sarras y las Milenarias de Lambton Worm, Dama Dragón y Guadaña Dragón; vienen más.",
      "Tus barajas guardadas y los enlaces que ya compartiste siguen abriéndose con todas sus cartas.",
    ],
  },
  {
    fecha: "2026-09-29",
    tipo: "Novedad",
    titulo: "Diez cartas más, y tres ediciones nuevas en el filtro",
    texto: [
      "Llegan las cartas que la Banlist pone en observación: Wyvern Dorado (Camelot), Melusina (Templarios), Anubis de Inpu y Mut (Kemet), y Bibi Dalair Kaur, Ráksasa Sombrío y Muhammad bin Qasim (Dharma). Van con su texto impreso: las condiciones de la Banlist todavía no se aplican.",
      "Templarios suma además las Milenarias de Lambton Worm, Dama Dragón y Guadaña Dragón, y la promo de Sarras pasa a Camelot. Wotan y Jarnvid quedan fuera por ahora.",
    ],
  },
  {
    fecha: "2026-09-29",
    tipo: "Novedad",
    titulo: "Las cartas de los packs, en su edición",
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
    texto: [
      "El catálogo suma las cartas que traen el Pack Batalla y el Pack América y que no están en ninguna de las diez ediciones, como Tiamat, Thor el Poderoso, Lahmu, Dante o Devastador. Salen con el arte de su pack, y en el filtro de edición se encuentran por el nombre del pack.",
      'Ocho cartas de Pack América y Árbol del Grito de Dominio de Tótems llegarán cuando consigamos la imagen de su impresión. El buscador ahora exige todas las palabras: "Thor el Poderoso" encuentra a Thor y no a cada carta que diga "el".',
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Tres tipos de Oro, y un filtro para cada uno",
    texto: [
      "El catálogo y el constructor distinguen ahora los Oros con habilidad, los sin habilidad y los Oros iniciales de edición: las cartas «Oro Inicial» de cada edición, a arte completo, marcadas en la grilla.",
      "Se filtran desde el filtro Tipo, donde aparecen bajo «Oro». Los iniciales de edición funcionan igual que los sin habilidad: sirven de oro inicial de la baraja y no tienen tope de copias.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "La baraja en curso ya no se pierde",
    texto: [
      "El constructor guarda solo un borrador de la baraja que estás armando. Si recargas la página, cambias de sección o cierras la pestaña, al volver se retoma donde quedó.",
      "Un aviso sobre el panel lo indica y permite descartar el borrador. Al guardar la baraja, el borrador se borra.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "La Fe de Erratas y la Banlist, en Documentos",
    texto: [
      "La sección Documentos ya tiene la Fe de Erratas y la Banlist Estándar, transcritas con el estilo de DeckForge. Se pueden leer en el sitio, con el cambio de cada carta resaltado, o abrir y descargar en PDF.",
      "Por ahora son de consulta: el catálogo y el constructor todavía no las aplican.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Ninguna baraja se pierde al llegar a 50",
    texto: [
      "Con 50 barajas guardadas, crear, duplicar o guardar otra borraba en silencio la más antigua. Ahora no se guarda y un aviso explica que se llegó al máximo: basta eliminar alguna para hacer espacio.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "La estrella de portada, también en el teléfono",
    texto: [
      "En la página de una baraja, la estrella para elegir la carta de portada solo aparecía al pasar el cursor, así que en una pantalla táctil no se veía. Ahora en el teléfono y la tableta se ve siempre.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Novedades más cortas de recorrer",
    texto: [
      "Esta página muestra ahora las novedades de a seis. El botón «Ver más», al final, carga las seis siguientes.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Prueba manos y descarga tu baraja como imagen",
    texto: [
      "Al final de la página de cada baraja puedes robar una mano inicial de 8 cartas al azar, sin el oro inicial, y hacer mulligan: cada uno vuelve a barajar y roba una carta menos. Al lado está la curva de coste.",
      "Un botón nuevo en la página de la baraja la descarga como imagen, con todas sus cartas y copias, lista para compartir en redes o en un chat.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Nombres de baraja únicos y más largos",
    texto: [
      "Dos barajas ya no pueden llamarse igual. Si importas, duplicas o guardas una compartida con un nombre que ya tienes, se le agrega «(copia)».",
      "El nombre de una baraja admite ahora hasta 60 caracteres y la descripción hasta 280.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Los Mercenarios ya admiten cualquier cantidad de copias",
    texto: [
      "Grifo Dorado, Pincoya y Dodu son Mercenarios, y su habilidad permite llevar todas las copias que quieras. El constructor los limitaba a tres por error; ahora no tienen tope.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Quitar cartas desde su detalle y copias bien contadas",
    texto: [
      "En el constructor, el detalle de una carta ahora tiene «Quitar una copia», además de agregar.",
      "Con tres copias de una carta, el aviso decía que la baraja tenía cuatro. Ahora dice las que lleva de verdad.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Aviso",
    titulo: "Erratas ahora se llama Documentos",
    texto: [
      "La sección cambia de nombre y de dirección, de /erratas/ a /documentos/, porque ahí estarán los documentos oficiales para leer y descargar: la Fe de Erratas y la Banlist. Si la tenías guardada, actualiza el enlace.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Curva de coste en el constructor",
    texto: [
      "El panel de la baraja muestra cuántas cartas llevas de cada coste, en barras que se mueven a medida que agregas o quitas cartas. Así se ve de un vistazo si la baraja está cargada de cartas caras. La página de cada baraja también la muestra.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Avisos al copiar, exportar, guardar y borrar",
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
    texto: [
      "El detalle de una carta, la ayuda, los filtros, el menú del teléfono y la hoja de la baraja ya no aparecen de golpe: entran y salen con una animación corta. El panel de la baraja crece y se encoge con suavidad al agregar o quitar cartas. Si tu equipo tiene activado «reducir movimiento», se respeta y no hay animaciones.",
      "Mientras una página o una carta carga, se ve su forma en gris en vez de un hueco vacío.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Aviso",
    titulo: "Los mazos ahora se llaman barajas",
    texto: [
      "Así se dice en el juego, y el sitio ahora lo dice igual en todas partes. Las direcciones también cambiaron: Mis mazos pasó a Mis barajas y el Builder, a Constructor.",
      "Si compartiste una baraja antes de este cambio, ese enlace apunta a /mazo/ y ya no abre. Para tener uno nuevo: si la baraja está guardada en tu navegador, ábrela en Mis barajas y vuelve a copiar el enlace. Si solo tienes el enlace viejo, cambia /mazo/ por /baraja/ en la dirección: la baraja se abre y desde ahí puedes guardarla o compartirla de nuevo.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Novedad",
    titulo: "Ayuda y novedades",
    texto: [
      "El signo de pregunta de la barra de arriba abre las preguntas frecuentes: cómo guardar, compartir y armar una baraja. Y esta página cuenta lo que va cambiando en el sitio.",
      "En las páginas largas, un botón abajo a la derecha te sube al principio de una vez.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Enlaces más cortos para compartir",
    texto: [
      "El enlace de una baraja mide ahora cerca de la mitad, así se pega mejor en un chat.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "El logotipo al compartir un enlace",
    texto: [
      "Al pegar un enlace de DeckForge en WhatsApp o Discord, la vista previa muestra el logotipo del sitio.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Mejora",
    titulo: "Filtros más fáciles de recorrer",
    texto: [
      "El filtro de edición empieza por la más nueva, Escuelas Elementales, y termina en Bushido. Tipo, raza, escuela elemental y habilidad van en orden alfabético.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Importar ya no reemplaza tus barajas",
    texto: [
      "Un archivo con muchas barajas podía desplazar a las que ya tenías guardadas. Ahora solo entran las que caben, hasta el máximo de 50, y el aviso te dice cuántas quedaron fuera.",
    ],
  },
  {
    fecha: "2026-09-26",
    tipo: "Arreglo",
    titulo: "Las cartas de la baraja ya no saltan de lugar",
    texto: [
      "Al subir o bajar las copias de una carta, su fila se queda donde estaba: la baraja se ordena igual que el catálogo.",
    ],
  },
  {
    fecha: "2026-09-19",
    tipo: "Mejora",
    titulo: "Catálogo revisado carta por carta",
    texto: [
      "Se comparó el texto, el coste, la fuerza y el ilustrador de todo el catálogo con el arte de cada carta, y se corrigieron 90.",
    ],
  },
  {
    fecha: "2026-09-19",
    tipo: "Novedad",
    titulo: "La extensión de Escuelas Elementales",
    texto: [
      "Llegan las 11 cartas de la extensión que salió en los sobres de Despertar Gótico, con Visnu, Krisna y Harionna entre ellas.",
    ],
  },
  {
    fecha: "2026-09-16",
    tipo: "Novedad",
    titulo: "Escuelas Elementales, la edición que da nombre al formato",
    texto: [
      "Con ella están las diez ediciones del formato en el catálogo.",
      "Escuelas Elementales cambió el texto de varias cartas que ya existían, y el catálogo muestra siempre el vigente. Algunas ganaron Única o Errante: si tenías tres copias de una de ellas, el constructor te avisará que tu baraja ya no es legal.",
    ],
  },
  {
    fecha: "2026-09-16",
    tipo: "Arreglo",
    titulo: "El filtro de habilidad muestra lo que corresponde",
    texto: [
      "Una carta salía al filtrar por una habilidad aunque solo la mencionara, como una que les da Furia a tus Aliados. Ahora solo salen las que tienen esa habilidad.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Novedad",
    titulo: "Barajas Luz y Oscuridad",
    texto: [
      "Con Steampunk llega el atributo. Además de armar por raza o por escuela elemental, ahora puedes armar una baraja con todos sus Aliados Luz, o todos Oscuridad.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Novedad",
    titulo: "Cinco ediciones más",
    texto: [
      "Águila Imperial, Steampunk, Axis Mundi, Hijos del Sol y Legado Gótico entran al catálogo.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Novedad",
    titulo: "Side deck, portada y nota",
    texto: [
      "Tus barajas pueden llevar un side deck de hasta 10 cartas, que se arma desde el mismo constructor. También puedes elegir la carta que la representa en Mis barajas y escribirle una nota corta.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Arreglo",
    titulo: "La regla de los 15 Aliados o Tótems",
    texto: [
      "El mínimo lo tiene que cumplir un tipo solo: 15 Aliados, o 15 Tótems. Antes el constructor sumaba los dos y daba por buena una baraja que no lo era.",
    ],
  },
  {
    fecha: "2026-09-15",
    tipo: "Mejora",
    titulo: "El catálogo, ordenado por frecuencia",
    texto: [
      "Dentro de cada edición, las cartas van de la frecuencia más rara a la más común.",
    ],
  },
  {
    fecha: "2026-09-14",
    tipo: "Novedad",
    titulo: "Dominio y ContraAtaque",
    texto: ["Dos ediciones más en el catálogo, revisadas contra el arte de cada carta."],
  },
  {
    fecha: "2026-08-29",
    tipo: "Novedad",
    titulo: "Llega el constructor de barajas",
    texto: [
      "Arma tu baraja desde el catálogo, y el constructor te va diciendo qué le falta para ser legal: las 50 cartas, el oro inicial, las copias de cada carta y la afinidad.",
    ],
  },
  {
    fecha: "2026-08-29",
    tipo: "Novedad",
    titulo: "Mis barajas y compartir por enlace",
    texto: [
      "Guarda tus barajas en tu navegador, míralas en Mis barajas y compártelas con un enlace. También puedes exportarlas a un archivo e importarlas en otro computador.",
    ],
  },
  {
    fecha: "2026-08-29",
    tipo: "Arreglo",
    titulo: "Los Oros sin habilidad no tienen tope",
    texto: [
      "Puedes llevar todas las copias que quieras de un Oro sin habilidad; el constructor ya no los limita a 3.",
    ],
  },
  {
    fecha: "2026-08-28",
    tipo: "Novedad",
    titulo: "Abre DeckForge",
    texto: [
      "El catálogo de cartas de Bushido y Sol Naciente, con buscador y filtros, y el tema claro u oscuro para verlo como prefieras.",
    ],
  },
];
