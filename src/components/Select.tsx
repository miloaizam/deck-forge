"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { BOTON_ICONO_LIBRE_COMPACTO, TEXT_FIELD } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** Texto de la opcion vacia, que siempre va primera. */
  placeholder?: string;
  /**
   * Etiqueta visible de un valor, cuando no coinciden. Lo usa el filtro de
   * edicion, que guarda el slug pero muestra el titulo.
   */
  format?: (value: string) => string;
  /** La etiqueta solo para lectores, cuando el selector va en una fila sin titulos. */
  etiquetaOculta?: boolean;
  /**
   * Un control que siempre tiene valor (la zona del constructor, el formato,
   * la visibilidad): sin opcion vacia, sin X para limpiar y sin el violeta de
   * "filtro puesto", porque elegir una opcion no es filtrar.
   */
  requerido?: boolean;
  /** Texto secundario de cada opcion, a la derecha: la cuenta de cartas. */
  detalle?: (value: string) => string | null;
  /**
   * Clases del detalle en el boton (en la lista siempre se ve): la zona del
   * constructor lo esconde cuando la fila del buscador es angosta.
   */
  detalleEnBoton?: string;
  /** Icono antes del texto de cada opcion. */
  icono?: (value: string) => ReactNode;
  /** El motivo por el que una opcion no se puede elegir; `null` si se puede. */
  deshabilitada?: (value: string) => string | null;
  /** Todo el control, mientras se hace lo que se eligio. */
  disabled?: boolean;
  /** Clases del contenedor: el ancho, en una fila de botones. */
  className?: string;
}

/**
 * A partir de cuantas opciones el desplegable trae buscador.
 *
 * Con cinco opciones a la vista (Tipo, Escuela elemental) un campo de texto
 * es un trasto: se leen todas de una mirada y buscar cuesta mas que elegir.
 * Con trece razas o veinte keywords ya no, y ahi el campo se gana el sitio.
 */
const MIN_OPCIONES_PARA_BUSCAR = 8;

/** Minusculas y sin tildes: "samurai" tiene que encontrar "Samurái". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Selector de una opcion, con la estetica de la marca.
 *
 * El <select> nativo no se puede estilizar: el navegador dibuja la lista con
 * los colores del sistema y queda fuera de la paleta. Este componente es un
 * listbox segun el patron ARIA, asi que conserva lo que el nativo daba gratis:
 * anuncio del rol, navegacion con flechas, Inicio/Fin, Enter, Escape y foco
 * visible.
 *
 * Cuando hay opciones de sobra el desplegable abre con un buscador y pasa a
 * ser un combobox: el foco va al campo, las flechas siguen recorriendo la
 * lista y la opcion activa se anuncia con `aria-activedescendant`. La lista
 * filtra por el texto que se ve (`format`) y sin tildes.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Todos",
  format = (v) => v,
  etiquetaOculta = false,
  requerido = false,
  detalle,
  detalleEnBoton,
  icono,
  deshabilitada,
  disabled = false,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const buscable = options.length >= MIN_OPCIONES_PARA_BUSCAR;
  const consulta = normalizar(query.trim());

  // La opcion vacia va primera y equivale a "sin filtrar", pero solo mientras
  // no se este buscando: entre los resultados de una busqueda no pinta nada.
  const items = consulta
    ? options.filter((o) => normalizar(format(o)).includes(consulta))
    : requerido
      ? options
      : ["", ...options];
  const selectedIndex = Math.max(0, items.indexOf(value));

  const close = (devolverFoco = true) => {
    setOpen(false);
    setQuery("");
    if (devolverFoco) buttonRef.current?.focus();
  };

  const pick = (index: number) => {
    // Sin coincidencias no hay nada que elegir: Enter no tiene que romper.
    if (index < 0 || index >= items.length) return;
    // Una opcion deshabilitada se puede recorrer, no elegir.
    if (items[index] && deshabilitada?.(items[index])) return;
    onChange(items[index]);
    close();
  };

  // El indice activo se fija al abrir, no en un efecto: hacerlo en un efecto
  // dispara un render extra en cascada.
  const toggle = () => {
    if (open) {
      close(false);
      return;
    }
    setQuery("");
    setActive(selectedIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Al abrir, el foco pasa al buscador si lo hay y a la lista si no, para que
  // las flechas la recorran en los dos casos.
  useEffect(() => {
    if (open) (inputRef.current ?? listRef.current)?.focus();
  }, [open]);

  // Mantiene visible la opcion activa cuando se navega con el teclado.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case " ":
        // Con buscador la barra es un espacio que se escribe, no un atajo.
        if (buscable) break;
        e.preventDefault();
        pick(active);
        break;
      case "Enter":
        e.preventDefault();
        pick(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  // Un filtro sin opciones no aporta nada: no se muestra.
  if (options.length === 0) return null;

  const activo = !requerido && value !== "";
  const detalleDelValor = value ? (detalle?.(value) ?? null) : null;
  const listId = `${id}-list`;
  // Sin coincidencias no hay opcion activa que anunciar.
  const activeId = items.length > 0 ? `${id}-opt-${active}` : undefined;

  return (
    // `justify-end`: si una etiqueta se parte en dos lineas, los botones de la
    // fila siguen alineados abajo.
    <div
      ref={rootRef}
      className={cn("relative flex min-w-0 flex-col justify-end gap-1.5", className)}
    >
      <span
        id={`${id}-label`}
        className={cn(
          "text-muted text-[11px] tracking-[0.18em] uppercase",
          etiquetaOculta && "sr-only",
        )}
      >
        {label}
      </span>

      {/* El boton de limpiar va aparte y superpuesto: un <button> no puede
          anidar otro <button>. */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          // La cuenta que se ve tambien va en el nombre (axe:
          // label-content-name-mismatch).
          aria-labelledby={
            detalleDelValor
              ? `${id}-label ${id}-value ${id}-detalle`
              : `${id}-label ${id}-value`
          }
          className={cn(
            "focus-visible:outline-brand-500 rounded-chip flex h-11 w-full items-center gap-2 border pr-10 pl-3 text-sm transition-colors",
            activo
              ? "border-brand-600 bg-accent-soft text-ink"
              : cn(
                  "border-line bg-panel hover:outline-brand-500 hover:text-ink hover:outline-2 hover:outline-offset-2",
                  requerido ? "text-ink" : "text-muted",
                ),
            disabled && "cursor-wait opacity-60",
          )}
        >
          {value && icono && <span className="text-muted shrink-0">{icono(value)}</span>}
          <span id={`${id}-value`} className="truncate">
            {value ? format(value) : placeholder}
          </span>
          {/* El espacio no se pinta (es flex) pero separa en el texto del
              boton: sin el, axe lee «Tengo0» y no lo halla en el nombre. */}
          {detalleDelValor && " "}
          {detalleDelValor && (
            <span
              id={`${id}-detalle`}
              className={cn(
                "text-muted ml-auto shrink-0 text-[12px] tabular-nums",
                detalleEnBoton,
              )}
            >
              {detalleDelValor}
            </span>
          )}
        </button>

        {activo ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              close(false);
            }}
            aria-label={`Quitar el filtro ${label}`}
            className={cn(
              BOTON_ICONO_LIBRE_COMPACTO,
              "text-accent hover:text-accent absolute top-1/2 right-1 -translate-y-1/2",
            )}
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={cn(
              "text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </div>

      {/* Siempre montado y oculto con `hidden`: asi el cierre puede
          desvanecerse (ver `.despliegue` en globals.css). */}
      <div
        className={cn(
          "despliegue border-line bg-panel shadow-panel rounded-card absolute top-full right-0 left-0 z-20 mt-1.5 border py-1.5",
          !open && "hidden",
        )}
      >
        {/* El buscador va fuera de la lista y no scrollea con ella: la lista
              se recorre y el campo se queda donde se escribe. */}
        {buscable && (
          <div className="relative px-1.5 pb-1.5">
            <Search
              size={15}
              aria-hidden="true"
              className="text-muted pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
            />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // La lista cambia entera: el recorrido vuelve a empezar.
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Buscar…"
              aria-label={`Buscar en ${label}`}
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
              className={cn(TEXT_FIELD, "bg-surface h-9 pr-3 pl-8")}
            />
          </div>
        )}

        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={buscable ? undefined : activeId}
          onKeyDown={buscable ? undefined : onKeyDown}
          className="max-h-72 scrollbar-none overflow-y-auto outline-none"
        >
          {items.map((item, i) => {
            const seleccionada = item === value;
            const motivo = item ? (deshabilitada?.(item) ?? null) : null;
            const extra = item ? (detalle?.(item) ?? null) : null;
            return (
              <li
                key={item || "__todos"}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={seleccionada}
                aria-disabled={motivo ? true : undefined}
                title={motivo ?? undefined}
                onClick={() => pick(i)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors",
                  i === active && "bg-surface",
                  seleccionada ? "text-accent" : "text-ink",
                  !item && "text-muted",
                  motivo && "text-muted cursor-not-allowed opacity-60",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {item && icono && (
                    <span className="text-muted shrink-0">{icono(item)}</span>
                  )}
                  <span className="truncate">{item ? format(item) : placeholder}</span>
                </span>
                {extra && " "}
                <span className="flex shrink-0 items-center gap-2">
                  {extra && (
                    <span className="text-muted text-[12px] tabular-nums">{extra}</span>
                  )}
                  {seleccionada && <Check size={14} aria-hidden="true" />}
                </span>
              </li>
            );
          })}

          {items.length === 0 && (
            <li role="presentation" className="text-muted px-3 py-2.5 text-sm">
              Sin coincidencias
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
