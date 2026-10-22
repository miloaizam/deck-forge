"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileText,
  Hammer,
  Layers,
  Library,
  LibraryBig,
  Menu,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { HelpButton } from "./HelpButton";
import { AccountButton } from "./nube/AccountButton";
import { useConCuenta } from "./nube/use-con-cuenta";
import { ThemeToggle } from "./ThemeToggle";
import { NUBE_ACTIVA } from "@/lib/supabase-config";
import { BOTON_ICONO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Lo personal: sin cuenta no se muestra (`useConCuenta`). */
  privado?: boolean;
}

/** La Comunidad solo existe con las cuentas encendidas (`supabase-config.ts`). */
const LINKS: NavLink[] = [
  { href: "/catalogo", label: "Catálogo", Icon: LibraryBig },
  { href: "/constructor", label: "Constructor", Icon: Hammer, privado: true },
  { href: "/barajas", label: "Mis barajas", Icon: Layers, privado: true },
  { href: "/coleccion", label: "Colección", Icon: Library, privado: true },
  ...(NUBE_ACTIVA ? [{ href: "/comunidad", label: "Comunidad", Icon: Users }] : []),
  { href: "/documentos", label: "Documentos", Icon: FileText },
  { href: "/novedades", label: "Novedades", Icon: Sparkles },
];

/** `/catalogo` tambien queda activo dentro de `/catalogo/bushido`. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LINK =
  "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-chip px-2 xl:px-3 text-sm transition-colors focus-visible:outline-brand-500";

/**
 * El tipo de transicion que pide el fundido entre paginas (layout de (app)).
 * Solo lo llevan los enlaces de la navbar: la carga inicial no lleva tipo y no
 * se anima. Animarla le costaba ~2 s de LCP al catalogo, porque React espera
 * a que carguen las imagenes antes de revelar la pagina con una transicion.
 */
const TRANSICION = ["pagina"];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Sin cuenta, el constructor, Mis barajas y la coleccion no se ofrecen: los
  // piden (`RequiereCuenta`). Se entra desde el icono de la cuenta.
  const conCuenta = useConCuenta();
  const links = conCuenta ? LINKS : LINKS.filter((l) => !l.privado);

  // Cerrar con Escape. Al navegar lo cierra el onClick de cada enlace: hacerlo
  // en un efecto sobre pathname dispararia un render en cascada.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    // Con nombre propio en las View Transitions: queda quieta y por encima del
    // contenido que se funde al cambiar de pagina (globals.css).
    <header className="border-line bg-bg/85 sticky top-0 z-30 border-b backdrop-blur [view-transition-name:navbar]">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-[1480px] items-center gap-2 px-4 py-3 sm:px-6"
      >
        <Link
          href="/"
          className="focus-visible:outline-brand-500 mr-1 shrink-0 rounded sm:mr-2"
        >
          {/* El logotipo blanco es invisible sobre el fondo claro: cada tema
              usa su version y el CSS elige cual se muestra. */}
          <Image
            src="/brand/logo-white.svg"
            alt="DeckForge"
            width={140}
            height={28}
            priority
            className="solo-oscuro h-auto w-28 sm:w-[140px]"
          />
          <Image
            src="/brand/logo-violet.svg"
            alt="DeckForge"
            width={140}
            height={28}
            priority
            className="solo-claro h-auto w-28 sm:w-[140px]"
          />
        </Link>

        {/* Los cinco enlaces no caben junto al logotipo en un telefono, asi
            que ahi se pliegan detras del boton de menu. */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              transitionTypes={TRANSICION}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                LINK,
                // La pagina actual va subrayada en violeta, ademas de en
                // `ink`: el color solo no basta para distinguirla.
                isActive(pathname, href)
                  ? "text-ink decoration-brand-500 underline decoration-2 underline-offset-[6px]"
                  : "text-muted hover:text-ink",
              )}
            >
              {/* Con siete enlaces y la cuenta no caben los iconos entre lg y
                  xl: ahi van solo los nombres. */}
              <Icon
                size={15}
                aria-hidden="true"
                className={cn("opacity-70", NUBE_ACTIVA && "hidden xl:block")}
              />
              {label}
            </Link>
          ))}
        </div>

        {/* A 360 px la cuenta, la ayuda, el tema y el menu no caben junto al
            logotipo entero: bajo `sm` el logotipo se achica y se juntan. */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* La cuenta, la ayuda y el tema quedan a la vista tambien en el
              telefono: no se pliegan en el menu. */}
          <AccountButton />
          <HelpButton />
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? "Cerrar el menú" : "Abrir el menú"}
            className={cn(BOTON_ICONO, "lg:hidden")}
          >
            {open ? (
              <X size={16} aria-hidden="true" />
            ) : (
              <Menu size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Siempre en la pagina, para poder desplegarlo: la fila de la grilla
          pasa de 0fr a 1fr y el contenido se descubre de arriba hacia abajo.
          Cerrado queda `inert` e invisible, fuera del teclado y del lector. */}
      <div
        id="menu-principal"
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,visibility] duration-200 ease-(--ease-out-soft) lg:hidden",
          open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul className="border-line bg-bg mx-auto flex max-w-[1480px] flex-col border-t px-4 py-2">
            {links.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  transitionTypes={TRANSICION}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={cn(
                    "rounded-chip focus-visible:outline-brand-500 flex h-12 items-center gap-2.5 px-3 text-[15px] transition-colors",
                    isActive(pathname, href)
                      ? "text-accent bg-accent-soft"
                      : "text-muted hover:text-ink",
                  )}
                >
                  <Icon size={17} aria-hidden="true" className="opacity-70" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
