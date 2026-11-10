import type { CookieOptions, Request, Response } from 'express';
import { iniciarSesion } from '../services/auth/iniciarSesion';
import { registrarUsuario } from '../services/auth/registrarUsuario';
import { obtenerUsuarioActual } from '../services/auth/obtenerUsuarioActual';
import { AppError } from '../middlewares/errors/AppError';
import { env } from '../config/env';
import {
  DURACION_SESION_SEGUNDOS,
  NOMBRE_COOKIE_SESION,
} from '../services/auth/token';

// httpOnly: el JavaScript del navegador no puede leer la cookie (protege el
// token de un ataque XSS). sameSite 'lax': no se envía en peticiones que otros
// sitios disparan, salvo navegaciones normales. secure: solo por HTTPS, se
// activa en producción porque en desarrollo se trabaja por http://localhost.
const opcionesCookie: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
};

/**
 * POST /api/auth/registro
 * Crea un organizador y responde 201 con sus datos públicos. No inicia
 * sesión: eso lo hace el login. Los datos ya pasaron por las validaciones de
 * la ruta. Si algo falla, Express 5 manda el error al manejador central.
 */
export const registrar = async (req: Request, res: Response): Promise<void> => {
  const { nombre, apellido, email, contrasenia } = req.body;

  const usuario = await registrarUsuario({
    nombre,
    apellido,
    email,
    contrasenia,
  });

  res.status(201).json({ usuario });
};

/**
 * POST /api/auth/login
 * Si las credenciales son correctas, guarda el token en una cookie httpOnly
 * que dura lo mismo que el token (un día) y responde 200 con los datos
 * públicos del usuario. El token no viaja en el cuerpo de la respuesta. Con
 * credenciales incorrectas el caso de uso lanza un 401.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, contrasenia } = req.body;

  const { usuario, token } = await iniciarSesion({ email, contrasenia });

  res.cookie(NOMBRE_COOKIE_SESION, token, {
    ...opcionesCookie,
    maxAge: DURACION_SESION_SEGUNDOS * 1000,
  });
  res.status(200).json({ usuario });
};

/**
 * POST /api/auth/logout
 * Borra la cookie de sesión y responde 204. No requiere estar autenticado:
 * si no había sesión, simplemente no hay nada que borrar.
 */
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(NOMBRE_COOKIE_SESION, opcionesCookie);
  res.status(204).end();
};

/**
 * GET /api/auth/yo
 * Devuelve los datos públicos del organizador con la sesión iniciada. El id
 * lo carga el middleware autenticar; si por algún motivo falta, es un 401.
 */
export const usuarioActual = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (req.usuarioId === undefined) {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }

  const usuario = await obtenerUsuarioActual(req.usuarioId);

  res.status(200).json({ usuario });
};
