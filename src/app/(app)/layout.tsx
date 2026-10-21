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
 * (y cuando el esqueleto de `loading.tsx` da paso a la pagina) el navegador
 * funde lo viejo con lo nuevo, con la API de View Transitions. La navbar
 * queda fuera, quieta, como referencia. La clase `pagina` la anima
 * `globals.css`; sin soporte del navegador, el cambio es de golpe, como antes.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      <ViewTransition update="pagina" default="none">
        {children}
      </ViewTransition>
      <ScrollTopButton />
      <Toaster />
    </>
  );
}
