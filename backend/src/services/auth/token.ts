import { sign, verify, TokenExpiredError } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/errors/AppError';

// La sesión dura un día: el token y la cookie vencen juntos.
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 24;

// Nombre de la cookie donde viaja el token. Lo usan el login (para guardarla),
// el logout (para borrarla) y el middleware de autenticación (para leerla).
export const NOMBRE_COOKIE_SESION = 'token';

// Algoritmo con el que se firma el token. "sign" usa HS256 por defecto; acá se
// deja explícito para usar exactamente el mismo al verificar.
const ALGORITMO = 'HS256';

const MENSAJE_SESION_VENCIDA = 'La sesión venció. Iniciá sesión de nuevo.';
const MENSAJE_SESION_INVALIDA = 'Sesión inválida. Iniciá sesión de nuevo.';

/**
 * Genera el JWT de la sesión. Lleva solo el id del usuario (en el campo
 * estándar "sub") y vence a las 24 horas. La verificación la hace
 * verificarToken, que usa el middleware de autenticación.
 */
export const generarToken = (usuarioId: number): string =>
  sign({}, env.JWT_SECRET, {
    algorithm: ALGORITMO,
    subject: String(usuarioId),
    expiresIn: DURACION_SESION_SEGUNDOS,
  });

/**
 * Verifica un token de sesión y devuelve el id del usuario que lleva.
 *
 * "verify" comprueba dos cosas por nosotros: que la firma sea válida (que el
 * token lo generó este servidor con JWT_SECRET y nadie lo modificó) y que no
 * haya vencido. Si algo falla, "verify" lanza una excepción; acá se la
 * convierte en un AppError 401 para que el manejador central de errores
 * responda al cliente. El detalle técnico del fallo no se expone: solo se
 * distingue "venció" de "inválido" para que el frontend sepa qué mostrar.
 *
 * Se restringe "algorithms" a HS256 para que no se acepte un token firmado con
 * otro algoritmo .
 */
export const verificarToken = (token: string): number => {
  let payload: string | JwtPayload;

  try {
    payload = verify(token, env.JWT_SECRET, { algorithms: [ALGORITMO] });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError(MENSAJE_SESION_VENCIDA, 401);
    }
    throw new AppError(MENSAJE_SESION_INVALIDA, 401);
  }

  // "verify" puede devolver un texto o un objeto; el nuestro siempre es un
  // objeto con "sub" (lo pone generarToken). Se comprueba igual por seguridad.
  if (typeof payload === 'string' || payload.sub === undefined) {
    throw new AppError(MENSAJE_SESION_INVALIDA, 401);
  }

  // "sub" es siempre un texto: se vuelve a convertir al id numérico.
  const usuarioId = Number(payload.sub);
  if (!Number.isInteger(usuarioId) || usuarioId < 1) {
    throw new AppError(MENSAJE_SESION_INVALIDA, 401);
  }

  return usuarioId;
};