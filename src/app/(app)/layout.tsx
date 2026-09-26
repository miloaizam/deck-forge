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
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      {children}
      <ScrollTopButton />
      <Toaster />
    </>
  );
}
