"use client";

import { useSearchParams } from "next/navigation";

import { useNube } from "../nube/nube";
import { RequiereCuenta } from "../nube/RequiereCuenta";
import { DeckListSkeleton } from "../Skeleton";
import { LobbyMesa } from "./LobbyMesa";
import { SalaDetalle } from "./SalaDetalle";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * `/mesa`: sin parametros, la entrada (crear o unirse, `?c=` trae el codigo
 * de un enlace); con `?s=<id>`, la sala. Pide cuenta, y espera a tener el
 * usuario: cada peticion va con su token.
 */
export function SalaView() {
  return (
    <RequiereCuenta para="jugar en la mesa" esqueleto={<DeckListSkeleton />}>
      <ConUsuario />
    </RequiereCuenta>
  );
}

function ConUsuario() {
  const params = useSearchParams();
  const nube = useNube();
  if (nube.fase !== "con-sesion") return <DeckListSkeleton />;
  const s = params.get("s");
  const uid = nube.usuario.id;
  return s && UUID.test(s) ? (
    <SalaDetalle key={s} id={s} uid={uid} />
  ) : (
    <LobbyMesa codigoInicial={params.get("c")} />
  );
}
