import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";

import { CintaCartas } from "@/components/CintaCartas";
import { PortadaCuenta } from "@/components/nube/PortadaCuenta";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCards } from "@/lib/cards";
import { DESTACADAS_FIJAS, type CartaCinta } from "@/lib/destacadas";
import { PRIMARY_BUTTON } from "@/lib/ui";

/** El grupo fijo de la cinta, resuelto en el build: va en el HTML. */
async function cartasFijas(): Promise<CartaCinta[]> {
  const cards = await getCards();
  return DESTACADAS_FIJAS.flatMap((id) => {
    const c = cards.find((card) => card.id === id);
    return c ? [{ nombre: c.nombre, imagen: c.imagen, thumb: c.thumb }] : [];
  });
}

export default async function Home() {
  const fijas = await cartasFijas();
  return (
    // El degradado cubre toda el area disponible: `flex-1` recibe del body
    // toda la altura menos el footer. Es una columna con tres piezas, y la
    // cinta cambia de sitio con `order`: en el telefono va entre el texto y
    // los botones, para que se vea sin bajar; desde `md`, al pie, a todo el
    // ancho, y el resto queda centrado en lo que sobra.
    <main className="bg-forge relative flex flex-1 flex-col items-center overflow-hidden pt-20 pb-12 md:pb-8">
      {/* La portada no lleva navbar, asi que el control de tema va esquinado
          arriba a la derecha. */}
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      {/* Resplandor decorado. Su color viene del tema para no quedar como una
          mancha lavada sobre fondo claro. */}
      <div
        aria-hidden="true"
        className="bg-halo pointer-events-none absolute top-[-16rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[130px]"
      />

      <div className="relative order-1 w-full max-w-[1040px] px-6 text-center md:mt-auto">
        <div className="border-line bg-accent-soft shadow-glow rounded-app mx-auto mb-10 flex size-24 items-center justify-center border">
          {/* El isotipo blanco desaparece sobre el marco claro, asi que cada
              tema usa su version. Lo conmuta el CSS, igual que el resto. */}
          <Image
            src="/brand/icon-white.svg"
            alt=""
            width={60}
            height={60}
            priority
            className="solo-oscuro"
          />
          <Image
            src="/brand/icon-violet.svg"
            alt=""
            width={60}
            height={60}
            priority
            className="solo-claro"
          />
        </div>

        <p className="eyebrow mb-5">Mitos y Leyendas · Escuelas Elementales</p>

        <h1 className="text-wordmark text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.02] font-bold tracking-[-0.02em]">
          Donde se forjan las barajas
        </h1>

        <p className="text-muted mx-auto mt-6 max-w-[54ch] text-[17px] leading-relaxed">
          Consulta el catálogo completo del formato, encuentra la carta que buscas y arma
          tu baraja. Gratis y sin instalar nada.
        </p>
      </div>

      <div className="relative order-3 w-full max-w-[1040px] px-6 text-center md:mb-auto">
        <div className="mt-8 flex justify-center md:mt-10">
          <Link href="/catalogo" className={PRIMARY_BUTTON}>
            <Flame size={19} aria-hidden="true" />
            Entrar a la forja
          </Link>
        </div>

        {/* Debajo, la cuenta: el constructor, Mis barajas y la coleccion la
            piden, y aqui se crea con Google. */}
        <PortadaCuenta />
      </div>

      {/* En el HTML va al final, tras los botones: con el teclado se llega
          primero a «Entrar a la forja» y despues a las doce cartas. */}
      <div className="relative order-2 mt-10 w-full md:order-4 md:mt-12">
        <CintaCartas fijas={fijas} />
      </div>
    </main>
  );
}
