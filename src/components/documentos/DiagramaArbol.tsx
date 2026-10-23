/**
 * El arbol de resolucion de habilidades (7.2 del DAR), redibujado del
 * original: cada habilidad con el numero en que se dispara, y en el circulo el
 * orden en que se resuelve. SVG en linea con los colores del tema, asi que se
 * ve bien en claro y en oscuro sin una imagen por cada uno.
 */

const W = 128;
const H = 34;

const NODOS: { n: number; x: number; y: number; resuelve: number }[] = [
  { n: 1, x: 80, y: 175, resuelve: 8 },
  { n: 2, x: 250, y: 115, resuelve: 4 },
  { n: 3, x: 250, y: 245, resuelve: 7 },
  { n: 4, x: 430, y: 75, resuelve: 2 },
  { n: 5, x: 430, y: 150, resuelve: 3 },
  { n: 7, x: 430, y: 245, resuelve: 6 },
  { n: 6, x: 600, y: 75, resuelve: 1 },
  { n: 8, x: 600, y: 245, resuelve: 5 },
];

/** Quien dispara a quien. */
const ARISTAS: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [4, 6],
  [3, 7],
  [7, 8],
];

const NIVELES = [80, 250, 430, 600];

const POR_NUMERO = new Map(NODOS.map((d) => [d.n, d]));

export function DiagramaArbol() {
  return (
    <figure className="my-6">
      {/* En el telefono no cabe y se desliza de lado: con el foco, tambien con
          las flechas del teclado (WCAG 2.1.1). */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Árbol de resolución de habilidades"
        className="bg-surface border-line rounded-panel overflow-x-auto border p-3 sm:p-4"
      >
        <svg
          viewBox="0 0 680 290"
          role="img"
          aria-labelledby="arbol-titulo arbol-desc"
          className="block w-full min-w-[540px]"
        >
          <title id="arbol-titulo">Orden de resolución de habilidades</title>
          <desc id="arbol-desc">
            La habilidad 1 dispara la 2 y la 3. La 2 dispara la 4 y la 5; la 4 dispara la
            6. La 3 dispara la 7, que dispara la 8. Se resuelven en este orden: 6, 4, 5,
            2, 8, 7, 3 y por último 1.
          </desc>
          <defs>
            <marker
              id="arbol-punta"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" className="fill-muted" />
            </marker>
          </defs>

          {NIVELES.map((x, i) => (
            <text
              key={x}
              x={x}
              y={20}
              textAnchor="middle"
              className="fill-accent text-[12px] font-semibold tracking-[0.12em]"
            >
              NIVEL {i + 1}
            </text>
          ))}
          <line
            x1={16}
            x2={664}
            y1={32}
            y2={32}
            className="stroke-line"
            strokeWidth={1.5}
          />

          {ARISTAS.map(([a, b]) => {
            const p = POR_NUMERO.get(a);
            const q = POR_NUMERO.get(b);
            if (!p || !q) return null;
            const x1 = p.x + W / 2 + 4;
            const x2 = q.x - W / 2 - 6;
            const m = (x1 + x2) / 2;
            return (
              <path
                key={`${a}-${b}`}
                d={`M${x1} ${p.y} C${m} ${p.y}, ${m} ${q.y}, ${x2} ${q.y}`}
                fill="none"
                strokeWidth={1.75}
                markerEnd="url(#arbol-punta)"
                className="stroke-muted"
              />
            );
          })}

          {NODOS.map((d) => (
            <g key={d.n}>
              <rect
                x={d.x - W / 2}
                y={d.y - H / 2}
                width={W}
                height={H}
                rx={10}
                strokeWidth={1}
                className="fill-panel stroke-line"
              />
              <text
                x={d.x}
                y={d.y + 4.5}
                textAnchor="middle"
                className="fill-ink text-[13px] font-semibold"
              >
                Habilidad {d.n}
              </text>
              <circle
                cx={d.x - W / 2 + 2}
                cy={d.y - H / 2 + 1}
                r={11}
                strokeWidth={2.5}
                className="fill-brand-600 stroke-surface"
              />
              <text
                x={d.x - W / 2 + 2}
                y={d.y - H / 2 + 5}
                textAnchor="middle"
                className="fill-white text-[12px] font-bold"
              >
                {d.resuelve}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="text-muted mt-2.5 flex items-center gap-2 text-[13px] leading-relaxed">
        <span
          aria-hidden="true"
          className="bg-brand-600 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        >
          1
        </span>
        El número del círculo es el orden en que se resuelve cada habilidad.
      </figcaption>
    </figure>
  );
}
