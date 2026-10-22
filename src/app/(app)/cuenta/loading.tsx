import { PageSkeleton } from "@/components/Skeleton";

/** Mientras llega la pagina al navegar: su forma, sin contenido. */
export default function Loading() {
  return <PageSkeleton variante="texto" />;
}
