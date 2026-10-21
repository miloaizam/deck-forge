import { ViewTransition } from "react";

import { Navbar } from "@/components/Navbar";
import { ScrollTopButton } from "@/components/ScrollTopButton";
import { Toaster } from "@/components/Toaster";

/**
 * Layout de las paginas internas. La portada queda fuera de este grupo, asi
 * que su HTML no lleva navbar: no es que se oculte con CSS.
 *
 * Los avisos flotantes se montan aqui y no en cada pagina: el layout no se
 * desmonta al navegar, asi que un aviso pedido antes de cambiar de pagina se
 * sigue viendo en la siguiente.
 *
 * El contenido va en un `<ViewTransition>`: al pasar de una pagina a otra
 * desde la navbar, el navegador funde lo viejo con lo nuevo con la API de
 * View Transitions. Solo anima las navegaciones de tipo `pagina`, que son las
 * que piden los enlaces de la navbar (`TRANSICION` en Navbar.tsx): la carga
 * inicial y el paso del esqueleto de `loading.tsx` a la pagina no llevan
 * tipo y no se animan, porque React esperaba a las imagenes para revelar la
 * pagina y el catalogo perdia ~2 s de LCP. La clase `pagina` la anima
 * `globals.css`; sin soporte del navegador, el cambio es de golpe.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      <ViewTransition update={{ pagina: "pagina", default: "none" }} default="none">
        {children}
      </ViewTransition>
      <ScrollTopButton />
      <Toaster />
    </>
  );
}
