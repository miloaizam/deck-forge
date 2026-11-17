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

## Datos

### El arte de Leyendas - Bloque Furia para tres cartas de VCR

- **Qué:** Helios, Tormod Kark y Reina Aesir tienen impresión en *Leyendas -
  Bloque Furia* (2023, `LBF-083`, `LBF-248` y `LBF-269`), que se podría sumar
  como Arte Alternativo. La API no tiene esa edición, el fandom no tiene esas
  tres imágenes y La Guarida tampoco.
- **Por dónde:** con una imagen limpia de cada una, cargarlas en
  `data-src/arte-alternativo.json` como `aa-424`… con origen
  `leyendas-bloque-furia` (nuevo en `ORIGENES` de `editions.ts`, primero de
  la lista: es de 2023). Texto y datos, los de la carta ya cargada; la
  frecuencia y el ilustrador, los de esa impresión (el fandom da Real para
  Helios, Vasallo para las otras dos).
- **Terminado cuando:** el selector de impresiones del modal ofrece el arte
  de Leyendas en las tres.
