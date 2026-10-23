import type { Metadata } from "next";
import Link from "next/link";

import { ENLACE } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Políticas de privacidad",
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
      <p className="eyebrow mb-3">Políticas de privacidad</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">
        Qué se guarda y quién lo ve
      </h1>

      <div className="mt-8 flex max-w-3xl flex-col gap-6">
        <section>
          <h2 className={TITULO}>Sin iniciar sesión</h2>
          <div className={TEXTO}>
            <p>
              Puedes ver el catálogo, los documentos y la Comunidad sin iniciar sesión. El
              tema que elijas y el borrador del constructor se guardan solo en{" "}
              <strong className="text-ink">este navegador</strong>.
            </p>
            <p>
              Las barajas y colecciones que compartes por enlace van dentro del mismo
              enlace y no pasan por ningún servidor.
            </p>
            <p>El sitio no usa cookies, publicidad ni estadísticas de visitas.</p>
          </div>
        </section>

        <section className={SECCION}>
          <h2 className={TITULO}>Con tu cuenta</h2>
          <div className={TEXTO}>
            <p>
              Tu cuenta se crea al iniciar sesión con Google. Los datos se guardan en{" "}
              <strong className="text-ink">Supabase</strong>, en servidores ubicados en
              São Paulo (Brasil):
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Tu <strong className="text-ink">correo y tu nombre de Google</strong>,
                para identificarte. Nunca se muestran a nadie.
              </li>
              <li>
                Tu <strong className="text-ink">alias</strong>, que es el nombre que se ve
                en tus barajas públicas.
              </li>
              <li>
                Tu <strong className="text-ink">foto de perfil</strong>, si pones una. Se
                guarda achicada, de 128 × 128 píxeles.
              </li>
              <li>
                Tus <strong className="text-ink">barajas y tu colección</strong>: qué
                cartas tienen, cuántas copias, y el nombre y la nota de cada baraja.
              </li>
              <li>
                Tus <strong className="text-ink">likes, las barajas que guardaste</strong>{" "}
                de la Comunidad y tus <strong className="text-ink">reportes</strong>.
              </li>
            </ul>
            <p>
              Google solo confirma tu identidad al iniciar sesión. DeckForge no le envía
              ningún dato.
            </p>
          </div>
        </section>

        <section className={SECCION}>
          <h2 className={TITULO}>Quién ve qué</h2>
          <div className={TEXTO}>
            <p>
              Tus barajas son <strong className="text-ink">privadas</strong>, salvo las
              que publiques. Cualquiera puede ver una baraja pública, con tu alias, tu
              foto de perfil, su nombre, su nota y sus cartas.
            </p>
            <p>
              De los likes y las copias solo se muestra el total. Los reportes solo los ve
              quien administra el sitio.
            </p>
            <p>Tus datos no se venden ni se comparten con nadie.</p>
          </div>
        </section>

        <section className={SECCION}>
          <h2 className={TITULO}>Cómo borrarlo</h2>
          <div className={TEXTO}>
            <p>
              Desde{" "}
              <Link href="/cuenta" className={ENLACE}>
                tu cuenta
              </Link>
              , con «Borrar mi cuenta», se borran al instante tu cuenta y todos sus datos,
              foto incluida, y también lo de este navegador. «Quitar foto» borra solo la
              foto. Al cerrar sesión, tus barajas, tu colección y el borrador del
              constructor se borran de este navegador (siguen en tu cuenta), así que quien
              lo use después no los ve. Si en ese momento no se pudo guardar lo último en
              tu cuenta, queda en el navegador hasta que vuelvas a entrar; si entra otra
              cuenta antes, se borra sin pasarse a ella.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
