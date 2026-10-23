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

## Interfaz

### Cartas destacadas en la portada

- **Qué:** un abanico de unas 5 cartas junto al título de la portada con las
  más usadas en las barajas de la Comunidad, que rota: cambia una carta cada
  5–6 s con un fundido, se pausa con el cursor encima y queda quieto con
  «reducir movimiento». Al tocar una carta se abre en el catálogo. En el
  teléfono va más chico y bajo el título.
- **Decisiones ya tomadas:**
  - Cuentan **solo las barajas públicas** y no ocultas, por `identidad` (las
    impresiones de una carta suman juntas) y en las últimas semanas.
  - El ranking sale de **Supabase**, con una función `security definer` en
    `supabase/esquema.sql`, y la base apenas trabaja: se guarda ya calculado
    (una tabla o vista materializada que se recalcula al publicar o una vez al
    día, no en cada visita) y la portada lee solo esas ~12 filas, con caché.
  - Antes de construir, una **maqueta** en captura para aprobarla.
- **Por dónde:** el HTML trae un grupo fijo elegido a mano (las Legendarias,
  por ejemplo), para que la portada se vea entera sin red y no empeore el LCP;
  al terminar de cargar pide el ranking en segundo plano y cambia a esas
  cartas. Con menos de ~10 barajas públicas, o si Supabase no responde, se
  queda el grupo fijo. Es una segunda excepción a «un visitante sin cuenta no
  le pide nada a Supabase» (hoy solo la Comunidad): cambiar en el mismo commit
  CLAUDE.md §6.5, `/privacidad` y la prueba de `e2e/nube.spec.ts` que lo
  vigila.
- **Terminado cuando:** la maqueta está aprobada, la portada rota con el
  ranking real, pasan `e2e`, `e2e:nube` y `a11y`, y Lighthouse no baja en la
  portada.
