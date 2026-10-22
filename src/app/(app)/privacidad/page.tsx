import type { Metadata } from "next";
import Link from "next/link";

import { ENLACE } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué guarda DeckForge, dónde, quién lo ve y cómo borrarlo.",
};

const SECCION = "border-line border-t pt-6";
const TITULO = "text-lg font-semibold";
const TEXTO = "text-muted mt-2 space-y-2 leading-relaxed";

/**
 * Lo que se guarda y quien lo ve, contado para quien juega. Si cambia lo que
 * guarda la cuenta (supabase/esquema.sql) o lo que se muestra en la
 * Comunidad, se cambia aqui en el mismo commit.
 */
export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Privacidad</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">
        Qué se guarda y quién lo ve
      </h1>

      <div className="mt-8 flex max-w-3xl flex-col gap-6">
        <section>
          <h2 className={TITULO}>Sin cuenta</h2>
          <div className={TEXTO}>
            <p>
              El catálogo, los documentos y la Comunidad se ven sin cuenta. El borrador
              del constructor y el tema se guardan solo en{" "}
              <strong className="text-ink">este navegador</strong>, y no salen de él.
            </p>
            <p>
              Una baraja o una colección compartida por enlace viaja dentro del propio
              enlace, tras el <code>#</code>, que el navegador no envía a ningún servidor.
            </p>
            <p>
              No hay cookies, ni publicidad, ni estadísticas de visitas, ni servicios de
              terceros: todo se sirve desde este mismo sitio.
            </p>
          </div>
        </section>

        <section className={SECCION}>
          <h2 className={TITULO}>Con cuenta</h2>
          <div className={TEXTO}>
            <p>
              Para armar y guardar barajas y llevar la colección hace falta una cuenta,
              que se crea entrando con Google. Se guarda en{" "}
              <strong className="text-ink">Supabase</strong>, en servidores de São Paulo:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Tu <strong className="text-ink">correo y tu nombre de Google</strong>,
                para identificarte. Nunca se muestran a nadie.
              </li>
              <li>
                Tu <strong className="text-ink">alias</strong>, si eliges uno: es el
                nombre que firma tus barajas públicas.
              </li>
              <li>
                Tus <strong className="text-ink">barajas y tu colección</strong>: los
                códigos de las cartas y sus copias, el nombre y la nota de cada baraja.
              </li>
              <li>
                Tus <strong className="text-ink">likes, las barajas que guardaste</strong>{" "}
                de la Comunidad y tus <strong className="text-ink">reportes</strong>.
              </li>
            </ul>
            <p>Google no recibe nada de DeckForge: solo confirma quién eres al entrar.</p>
          </div>
        </section>

        <section className={SECCION}>
          <h2 className={TITULO}>Quién ve qué</h2>
          <div className={TEXTO}>
            <p>
              Tus barajas son <strong className="text-ink">privadas</strong> hasta que tú
              publicas una. Una baraja pública la puede ver cualquiera, con tu alias, su
              nombre, su nota y sus cartas.
            </p>
            <p>
              De los likes y las copias solo se muestra el número, no quién los dio. Los
              reportes los lee solo quien administra el sitio, para moderar.
            </p>
            <p>Nada se vende ni se comparte con nadie.</p>
          </div>
        </section>

        <section className={SECCION}>
          <h2 className={TITULO}>Cómo borrarlo</h2>
          <div className={TEXTO}>
            <p>
              En{" "}
              <Link href="/cuenta" className={ENLACE}>
                tu cuenta
              </Link>
              , «Borrar mi cuenta» borra la cuenta y todo lo que tiene en la nube, en el
              acto. Lo guardado en el navegador se borra desde el propio navegador,
              borrando los datos del sitio.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
