/**
 * Ids de carta que existieron y se cambiaron por otros. Las barajas guardadas
 * en el navegador, los respaldos exportados y los enlaces compartidos los
 * siguen trayendo, asi que se traducen al leer (`cardRefSchema` en types.ts
 * pasa cada id por `idVigente`): sin esto, la carta desaparecia de la baraja.
 *
 * Solo se AGREGA: quitar una entrada vuelve a romper las barajas que la usan.
 *
 * 29-09-2026: las cartas de los packs dejaron sus ediciones propias. Las del
 * Pack de Batalla (`pb-`) van a Dominio, las de Pack America (`pa-`) a
 * Templarios o a ContraAtaque. Ver CLAUDE.md.
 */
export const ID_ANTERIORES: Readonly<Record<string, string>> = {
  "pb-001": "do-301",
  "pb-002": "do-302",
  "pb-004": "do-304",
  "pb-005": "do-305",
  "pb-006": "do-306",
  "pb-007": "do-307",
  "pb-008": "do-308",
  "pb-009": "do-309",
  "pb-011": "do-311",
  "pb-012": "do-312",
  "pb-013": "do-313",
  "pb-015": "do-315",
  "pb-016": "do-316",
  "pb-018": "do-318",
  "pb-019": "do-319",
  "pb-020": "do-320",
  "pb-023": "do-323",
  "pb-102": "do-402",
  "pb-103": "do-403",
  "pa-004": "te-007",
  "pa-011": "te-030",
  "pa-006": "te-032",
  "pa-019": "te-049",
  "pa-020": "te-059",
  "pa-021": "te-061",
  "pa-023": "te-063",
  "pa-001": "ca-151",
  "pa-013": "ca-152",
  "pa-014": "ca-153",
  "pa-016": "ca-154",
};

/** El id de hoy de una carta, o el mismo si nunca cambio. */
export function idVigente(id: string): string {
  return Object.hasOwn(ID_ANTERIORES, id) ? ID_ANTERIORES[id] : id;
}
