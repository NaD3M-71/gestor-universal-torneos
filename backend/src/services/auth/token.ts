import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';

// La sesión dura un día: el token y la cookie vencen juntos.
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 24;

/**
 * Genera el JWT de la sesión. Lleva solo el id del usuario (en el campo
 * estándar "sub") y vence a las 24 horas. La verificación del token la hace
 * el middleware de autenticación (1.4).
 */
export const generarToken = (usuarioId: number): string =>
  sign({}, env.JWT_SECRET, {
    subject: String(usuarioId),
    expiresIn: DURACION_SESION_SEGUNDOS,
  });
