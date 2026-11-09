import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errors/AppError';
import { NOMBRE_COOKIE_SESION, verificarToken } from '../services/auth/token';

/**
 * Middleware de autenticación. Se pone en las rutas que exigen haber iniciado
 * sesión, antes del controlador:
 *
 *   router.get('/yo', autenticar, obtenerUsuarioActual);
 *
 * Lee el token de la cookie de sesión (cargada por cookie-parser), lo verifica
 * y deja el id del usuario en req.usuarioId (campo declarado en
 * types/express.d.ts) para que el controlador sepa quién hace la petición.
 *
 * Si no hay cookie, o el token es inválido o venció, corta la petición con un
 * 401. En Express 5, un error lanzado dentro de un middleware llega solo al
 * manejador central de errores, por eso alcanza con hacer "throw".
 *
 * Solo comprueba que el token sea válido; no consulta la base de datos. Si
 * hace falta saber que el usuario todavía existe, eso lo hace cada caso de uso.
 */

export const autenticar = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const token: unknown = req.cookies?.[NOMBRE_COOKIE_SESION];

  if (typeof token !== 'string' || token === '') {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }

  req.usuarioId = verificarToken(token);
  next();
};
