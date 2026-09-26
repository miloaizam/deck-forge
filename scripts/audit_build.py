"""Audita el sitio ya construido antes de publicarlo.

Corre sobre `out/` y falla con codigo 1 si encuentra algo que no deberia salir
a produccion. La idea es que sea imposible publicar una regresion de seguridad
sin enterarse.

    pnpm run build && pnpm run audit

Que revisa:
  1. No hay source maps publicados (revelan el codigo fuente).
  2. No se filtraron rutas absolutas de la maquina de build.
  3. Nada apunta a un host externo: ni scripts, ni imagenes, ni fuentes.
  4. `_headers` existe y trae las cabeceras de seguridad obligatorias.
  5. La CSP no contiene 'unsafe-eval' ni comodines, y script-src no lleva
     'unsafe-inline': cada pagina autoriza sus <script> inline por hash.
     Se reconstruye la CSP que recibe cada HTML con las reglas de Cloudflare
     y se comprueba que cubra todos sus scripts, sin fiarse del generador.
  6. Toda imagen referenciada en el HTML existe realmente en el build.
  7. Los dos esquemas (TypeScript y Pydantic) declaran los mismos valores.
"""

import base64
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"

CABECERAS_OBLIGATORIAS = [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
]

# Hosts que sí pueden aparecer: son texto de mensajes de error de librerias,
# no recursos que el navegador vaya a pedir.
HOSTS_PERMITIDOS = ("nextjs.org", "react.dev", "github.com/zloirock", "www.w3.org")

fallos: list[str] = []
avisos: list[str] = []


def fallo(msg: str) -> None:
    fallos.append(msg)


def revisar_source_maps() -> None:
    mapas = list(OUT.rglob("*.map"))
    if mapas:
        fallo(f"{len(mapas)} source map(s) publicados, ej: {mapas[0].name}")


def revisar_rutas_absolutas() -> None:
    for f in list(OUT.rglob("*.html")) + list(OUT.rglob("*.js")):
        texto = f.read_text(encoding="utf-8", errors="ignore")
        if "/home/" in texto or "C:\\Users" in texto:
            fallo(f"ruta absoluta de la maquina de build filtrada en {f.relative_to(OUT)}")
            return


def revisar_hosts_externos() -> None:
    patron = re.compile(r'(?:src|href)="(https?://[^"]+)"')
    encontrados = set()
    for f in OUT.rglob("*.html"):
        for url in patron.findall(f.read_text(encoding="utf-8", errors="ignore")):
            if not any(h in url for h in HOSTS_PERMITIDOS):
                encontrados.add(url)
    for url in sorted(encontrados):
        fallo(f"recurso externo referenciado en el HTML: {url}")


# Limites de _headers en Cloudflare. Tambien los comprueba csp-hashes.mjs.
MAX_LINEA_HEADERS = 2000
MAX_REGLAS_HEADERS = 100

INLINE = re.compile(r"<script\b(?![^>]*\bsrc\s*=)[^>]*>(.*?)</script>", re.S | re.I)
NEXT_S = re.compile(r"^\(self\.__next_s=self\.__next_s\|\|\[\]\)\.push\((.*)\)$", re.S)


def sha(codigo: str) -> str:
    digest = hashlib.sha256(codigo.encode("utf-8")).digest()
    return "'sha256-" + base64.b64encode(digest).decode() + "'"


def hashes_inline(html: str) -> set[str]:
    """Los scripts inline de la pagina, mas los que next/script crea despues."""
    vistos = set()
    for codigo in INLINE.findall(html):
        vistos.add(sha(codigo))
        diferido = NEXT_S.match(codigo)
        if diferido:
            _, props = json.loads(diferido.group(1))
            vistos.add(sha(props.get("children", "")))
    return vistos


def leer_reglas(texto: str) -> list[dict]:
    """Parsea _headers como Cloudflare Pages (ver scripts/csp-hashes.mjs)."""
    reglas: list[dict] = []
    for linea in texto.splitlines():
        if not linea.strip() or linea.lstrip().startswith("#"):
            continue
        if not linea[0].isspace():
            patron = "(?P<splat>.*)".join(re.escape(p) for p in linea.strip().split("*"))
            patron = re.sub(r"\\?:(\w+)", r"(?P<\1>[^/]+)", patron)
            reglas.append({"re": re.compile(f"^{patron}$"), "set": [], "unset": []})
        elif linea.strip().startswith("!"):
            reglas[-1]["unset"].append(linea.strip()[1:].strip().lower())
        else:
            nombre, valor = linea.strip().split(":", 1)
            reglas[-1]["set"].append((nombre.strip().lower(), valor.strip()))
    return reglas


def cabeceras_para(reglas: list[dict], ruta: str) -> dict[str, str]:
    """Reglas en orden; `!` borra; una cabecera repetida se une con coma."""
    h: dict[str, str] = {}
    puestas: set[str] = set()
    for regla in reglas:
        if not regla["re"].match(ruta):
            continue
        for nombre in regla["unset"]:
            h.pop(nombre, None)
        for nombre, valor in regla["set"]:
            h[nombre] = f"{h[nombre]}, {valor}" if nombre in puestas and nombre in h else valor
            puestas.add(nombre)
    return h


def ruta_publica(html: Path) -> str:
    rel = html.parent.relative_to(OUT).as_posix()
    return "/" if rel == "." else f"/{rel}/"


def revisar_headers() -> None:
    headers = OUT / "_headers"
    if not headers.exists():
        fallo("falta out/_headers: el sitio saldria sin cabeceras de seguridad")
        return

    texto = headers.read_text(encoding="utf-8")
    for cabecera in CABECERAS_OBLIGATORIAS:
        if cabecera not in texto:
            fallo(f"_headers no declara {cabecera}")

    largas = [l for l in texto.splitlines() if len(l) > MAX_LINEA_HEADERS]
    if largas:
        fallo(f"_headers tiene {len(largas)} linea(s) de mas de {MAX_LINEA_HEADERS} caracteres")
    reglas = leer_reglas(texto)
    if len(reglas) > MAX_REGLAS_HEADERS:
        fallo(f"_headers tiene {len(reglas)} reglas, el maximo es {MAX_REGLAS_HEADERS}")

    # (ruta que la sirve, archivo). La 404 se sirve en cualquier ruta que no
    # exista, asi que se revisa con una que seguro no existe.
    paginas = [(ruta_publica(f), f) for f in OUT.rglob("index.html")]
    paginas.append(("/ruta-que-no-existe-auditoria/", OUT / "404.html"))

    for ruta, archivo in sorted(paginas):
        csp = cabeceras_para(reglas, ruta).get("content-security-policy", "")
        if not csp:
            fallo(f"{ruta} sale sin CSP")
            continue
        if ", " in csp:
            fallo(f"{ruta} recibe dos CSP unidas con coma (falta un `!` en _headers)")
        if "unsafe-eval" in csp:
            fallo(f"la CSP de {ruta} permite 'unsafe-eval'")
        if re.search(r"(default|script|img|font|connect)-src[^;]*\*", csp):
            fallo(f"la CSP de {ruta} usa un comodin * en alguna directiva")
        for directiva in ("object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"):
            if directiva not in csp:
                fallo(f"la CSP de {ruta} no cierra {directiva}")

        script_src = re.search(r"script-src([^;]*)", csp)
        permitidos = set(script_src.group(1).split()) if script_src else set()
        if "'unsafe-inline'" in permitidos:
            fallo(
                f"la CSP de {ruta} lleva 'unsafe-inline' en script-src: no corrio "
                "scripts/csp-hashes.mjs (usa `pnpm run build`, no `next build`)"
            )
        faltan = hashes_inline(archivo.read_text(encoding="utf-8")) - permitidos
        if faltan:
            fallo(f"{ruta}: {len(faltan)} script(s) inline sin su hash en la CSP; la pagina no hidrataria")

    if not fallos:
        print(f"CSP por hashes verificada en {len(paginas)} paginas.")


def revisar_imagenes() -> None:
    patron = re.compile(r'src="(/[^"]+\.(?:webp|svg|png|jpg))"')
    faltantes = set()
    for f in OUT.rglob("*.html"):
        for ruta in patron.findall(f.read_text(encoding="utf-8", errors="ignore")):
            if not (OUT / ruta.lstrip("/")).exists():
                faltantes.add(ruta)
    for ruta in sorted(faltantes):
        fallo(f"imagen referenciada que no existe en el build: {ruta}")


def revisar_descargables() -> None:
    """Los PDF enlazados existen, son PDF de verdad y no pasan de 1 MB.

    Viven en public/reglas/ y se publican tal cual (seguridad #11 de
    CLAUDE.md). Un enlace roto a un documento no lo ve ningun otro chequeo.
    """
    patron = re.compile(r'href="(/reglas/[^"#?]+)"')
    enlazados = set()
    for f in OUT.rglob("*.html"):
        enlazados.update(patron.findall(f.read_text(encoding="utf-8", errors="ignore")))
    for ruta in sorted(enlazados):
        archivo = OUT / ruta.lstrip("/")
        if not archivo.exists():
            fallo(f"descargable enlazado que no existe en el build: {ruta}")
            continue
        if archivo.suffix == ".pdf" and not archivo.read_bytes()[:5] == b"%PDF-":
            fallo(f"{ruta} no es un PDF")
        if archivo.stat().st_size > 1024 * 1024:
            fallo(f"{ruta} pesa mas de 1 MB")


def revisar_esquemas() -> None:
    """Los enums de TypeScript y Pydantic tienen que coincidir."""
    ts = (ROOT / "src" / "lib" / "types.ts").read_text(encoding="utf-8")
    py = (ROOT / "scripts" / "schema.py").read_text(encoding="utf-8")

    for const, clase in (("TIPOS", "Tipo"), ("FRECUENCIAS", "Frecuencia")):
        m = re.search(rf"export const {const} = \[(.*?)\] as const", ts, re.S)
        if not m:
            fallo(f"no pude leer {const} en types.ts")
            continue
        valores_ts = set(re.findall(r'"([^"]+)"', m.group(1)))

        m = re.search(rf"class {clase}\(str, Enum\):(.*?)(?:\n\n\nclass|\Z)", py, re.S)
        if not m:
            fallo(f"no pude leer la clase {clase} en schema.py")
            continue
        valores_py = set(re.findall(r'=\s*"([^"]+)"', m.group(1)))

        if valores_ts != valores_py:
            solo_ts = valores_ts - valores_py
            solo_py = valores_py - valores_ts
            fallo(
                f"{const}/{clase} desincronizados"
                + (f" | solo en TS: {sorted(solo_ts)}" if solo_ts else "")
                + (f" | solo en Python: {sorted(solo_py)}" if solo_py else "")
            )


def main() -> int:
    if not OUT.exists():
        print("No existe out/. Corre `pnpm run build` primero.")
        return 1

    for revision in (
        revisar_source_maps,
        revisar_rutas_absolutas,
        revisar_hosts_externos,
        revisar_headers,
        revisar_imagenes,
        revisar_descargables,
        revisar_esquemas,
    ):
        revision()

    for aviso in avisos:
        print(f"[aviso] {aviso}")

    if fallos:
        print(f"\n{len(fallos)} problema(s):")
        for f in fallos:
            print(f"  [FALLO] {f}")
        return 1

    print("\nAuditoria OK: sin problemas de seguridad en el build.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
