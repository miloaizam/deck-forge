/**
 * Deja que `node --test` resuelva los imports de src/.
 *
 * Node exige la extension en los imports de ESM, y el codigo de src/ los
 * escribe sin ella porque es lo que espera el bundler de Next. Este gancho
 * prueba a agregar `.ts` antes de rendirse, y con eso los modulos del repo se
 * pueden correr tal cual bajo el corredor de tests de Node.
 *
 * Lo mismo con los `.json`: el bundler los importa a secas, y Node pide el
 * atributo `type: "json"`. El gancho se lo pone, asi que un modulo que lee
 * los documentos (erratas.ts) corre igual en el sitio y en los tests.
 *
 * Es herramienta de build en pocas lineas, no una dependencia: Node 24 ejecuta
 * TypeScript de fabrica, asi que no hace falta ni vitest ni un transpilador.
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith(".json")) {
      const r = nextResolve(specifier, context);
      return { ...r, importAttributes: { ...r.importAttributes, type: "json" } };
    }
    const relativo = specifier.startsWith("./") || specifier.startsWith("../");
    if (relativo && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // No era un .ts: sigue el camino normal.
      }
    }
    return nextResolve(specifier, context);
  },
});
