/**
 * Ampliación de los tipos de Express.
 *
 * Por qué existe este archivo:
 * El middleware de autenticación (middlewares/autenticar.ts) verifica el token
 * de la cookie y necesita pasarle el id del usuario al controlador que se
 * ejecuta después. En Express, la forma habitual de pasar datos de un
 * middleware al siguiente es guardarlos en el objeto "req", por ejemplo:
 *
 *   req.usuarioId = 5;
 *
 * Pero el tipo "Request" que trae Express no conoce ningún campo "usuarioId",
 * así que TypeScript marcaría error tanto al escribirlo (en el middleware) como
 * al leerlo (en los controladores). Este archivo le avisa a TypeScript que
 * "Request" ahora puede tener ese campo.
 *
 * Cómo funciona:
 * - Es un archivo de declaración (.d.ts): solo le habla al compilador. No
 *   genera código ni cambia nada en tiempo de ejecución.
 * - "declare global" + "namespace Express" no crea un tipo nuevo: reabre el
 *   "Request" que Express ya define y le suma el campo ("declaration
 *   merging", la fusión de declaraciones de TypeScript).
 * - Como tsconfig.json no restringe qué archivos se compilan, TypeScript
 *   levanta este archivo solo, sin importarlo desde ningún lado.
 * - El "export {}" del final convierte este archivo en un módulo. Sin él,
 *   TypeScript lo trataría como un script suelto y "declare global" daría
 *   error.
 *
 * Por qué es opcional ("?"):
 * El campo solo existe en las rutas que pasan por el middleware de
 * autenticación. En las rutas públicas (registro, login, health) no se carga,
 * así que el tipo tiene que reflejar que puede no estar. Dentro de un
 * controlador protegido, el middleware garantiza que está; ahí se puede
 * comprobar o usar con la seguridad de que el middleware ya corrió.
 */
declare global {
  namespace Express {
    interface Request {
      /** Id del organizador autenticado. Lo carga el middleware autenticar. */
      usuarioId?: number;
    }
  }
}

export {};
