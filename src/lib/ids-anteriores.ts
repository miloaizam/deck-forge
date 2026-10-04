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
 * Templarios o a ContraAtaque, y la promo de Sarras pasa de Templarios a
 * Camelot. Se suman tambien los ids del primer intento (26-09-2026), que las
 * cargo unas horas con la impresion vieja en su edicion de origen (`su-`,
 * `re-`, `fu-`, `as-`, `cm-`, `te-`, `mi-`). Los de Templarios que volvieron
 * a nombrar la misma carta (`te-007`, `te-127`...) no estan: siguen en uso.
 *
 * 04-10-2026: se eliminan esas ediciones (Camelot, Templarios, Kemet, Dharma)
 * y las cartas de packs dejan Dominio y ContraAtaque. Todo va a Adicionales
 * (`ad-`), salvo las impresiones de otra carta ya cargada, que van a Arte
 * Alternativo (`aa-`). Las entradas de mas arriba apuntan ya al id de hoy:
 * la tabla no encadena traducciones.
 * Ver CLAUDE.md.
 */
export const ID_ANTERIORES: Readonly<Record<string, string>> = {
  "pb-001": "ad-001",
  "pb-002": "ad-002",
  "pb-004": "ad-003",
  "pb-005": "ad-004",
  "pb-006": "ad-005",
  "pb-007": "ad-006",
  "pb-008": "ad-007",
  "pb-009": "ad-008",
  "pb-011": "ad-009",
  "pb-012": "ad-010",
  "pb-013": "ad-011",
  "pb-015": "ad-012",
  "pb-016": "ad-013",
  "pb-018": "ad-014",
  "pb-019": "ad-015",
  "pb-020": "ad-016",
  "pb-023": "ad-017",
  "pb-102": "ad-018",
  "pb-103": "ad-019",
  "pa-004": "ad-020",
  "pa-011": "ad-021",
  "pa-006": "ad-022",
  "pa-019": "ad-023",
  "pa-020": "ad-024",
  "pa-021": "ad-025",
  "pa-023": "ad-026",
  "pa-001": "ad-027",
  "pa-013": "ad-028",
  "pa-014": "ad-029",
  "pa-016": "ad-030",
  "te-129": "aa-001",
  "su-004": "ad-002",
  "su-086": "ad-003",
  "su-091": "ad-004",
  "re-029": "ad-005",
  "re-065": "ad-006",
  "re-069": "ad-007",
  "re-114": "ad-008",
  "fu-138": "ad-001",
  "as-002": "ad-009",
  "as-005": "ad-010",
  "as-085": "ad-011",
  "as-104": "ad-017",
  "cm-013": "ad-012",
  "cm-065": "ad-013",
  "cm-193": "ad-014",
  "te-081": "ad-015",
  "te-082": "ad-016",
  "fu-004": "ad-027",
  "fu-033": "ad-028",
  "mi-015": "ad-029",
  "fu-038": "ad-030",
  // 04-10-2026: Adicionales y Arte Alternativo.
  "do-301": "ad-001",
  "do-302": "ad-002",
  "do-304": "ad-003",
  "do-305": "ad-004",
  "do-306": "ad-005",
  "do-307": "ad-006",
  "do-308": "ad-007",
  "do-309": "ad-008",
  "do-311": "ad-009",
  "do-312": "ad-010",
  "do-313": "ad-011",
  "do-315": "ad-012",
  "do-316": "ad-013",
  "do-318": "ad-014",
  "do-319": "ad-015",
  "do-320": "ad-016",
  "do-323": "ad-017",
  "do-402": "ad-018",
  "do-403": "ad-019",
  "te-007": "ad-020",
  "te-030": "ad-021",
  "te-032": "ad-022",
  "te-049": "ad-023",
  "te-059": "ad-024",
  "te-061": "ad-025",
  "te-063": "ad-026",
  "ca-151": "ad-027",
  "ca-152": "ad-028",
  "ca-153": "ad-029",
  "ca-154": "ad-030",
  "te-127": "ad-031",
  "cm-041": "ad-032",
  "te-002": "ad-033",
  "ke-002": "ad-034",
  "ke-159": "ad-035",
  "dh-028": "ad-036",
  "dh-054": "ad-037",
  "dh-276": "ad-038",
  "cm-238": "aa-001",
  "te-019": "aa-002",
  "te-020": "aa-003",
  "te-027": "aa-004",
};

/** El id de hoy de una carta, o el mismo si nunca cambio. */
export function idVigente(id: string): string {
  return Object.hasOwn(ID_ANTERIORES, id) ? ID_ANTERIORES[id] : id;
}
