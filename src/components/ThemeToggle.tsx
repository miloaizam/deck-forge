"use client";

import { Moon, Sun } from "lucide-react";

import { THEME_KEY } from "@/lib/theme";
import { BOTON_ICONO_LIBRE } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Cambia entre el tema oscuro (por defecto) y el claro.
 *
 * El tema vive en el atributo `data-theme` de <html> y en localStorage, no en
 * estado de React: el icono correcto lo elige el CSS. Asi no hay desajuste de
 * hidratacion ni un parpadeo del icono equivocado al cargar.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const claro = root.dataset.theme === "light";

    if (claro) {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = "light";
    }

    // localStorage puede fallar (ventana privada, cookies bloqueadas): que el
    // tema no persista es aceptable, que reviente la pagina no.
    try {
      localStorage.setItem(THEME_KEY, claro ? "dark" : "light");
    } catch {
      /* sin persistencia */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar tema"
      // Sin caja en reposo: la navbar es una fila de iconos, y un aro fijo la
      // cargaria. El anillo sale al apuntar o enfocar, como en todo el sitio.
      className={cn(BOTON_ICONO_LIBRE, "rounded-full")}
    >
      <Sun size={16} aria-hidden="true" className="solo-oscuro" />
      <Moon size={16} aria-hidden="true" className="solo-claro" />
    </button>
  );
}
