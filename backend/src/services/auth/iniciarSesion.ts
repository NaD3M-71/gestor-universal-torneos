import { AppError } from '../../middlewares/errors/AppError';
import type { UsuarioPublico } from '../../types/usuario';
import { buscarPorEmail } from '../../infrastructure/repositories/usuario.repository';
import { hashearContrasena, verificarContrasena } from './contrasena';
import { generarToken } from './token';

export interface DatosLogin {
  email: string;
  contrasena: string;
}

export interface ResultadoLogin {
  usuario: UsuarioPublico;
  token: string;
}

// Mismo mensaje para "el email no existe" y "la contraseña no coincide": así
// nadie puede usar el login para averiguar qué emails están registrados.
const MENSAJE_CREDENCIALES_INVALIDAS = 'Email o contraseña incorrectos.';

// Hash de relleno para comparar cuando el email no existe. Se calcula una sola
// vez, la primera vez que hace falta.
let hashDeRelleno: Promise<string> | undefined;
const obtenerHashDeRelleno = (): Promise<string> => {
  hashDeRelleno ??= hashearContrasena('contrasena-de-relleno');
  return hashDeRelleno;
};

/**
 * Caso de uso: inicio de sesión de un organizador.
 *
 * Busca al usuario por email (normalizado igual que al registrarse), compara la
 * contraseña con el hash guardado y, si coincide, genera el token de sesión.
 * Devuelve el token y los datos públicos del usuario (nunca el hash). Ante
 * cualquier credencial incorrecta lanza un AppError 401 con el mismo mensaje.
 * Cuando el email no existe igual se hace una comparación con un hash de
 * relleno, para que la respuesta tarde parecido y no delate si el email existe.
 */
export const iniciarSesion = async (
  datos: DatosLogin
): Promise<ResultadoLogin> => {
  const email = datos.email.trim().toLowerCase();
  const encontrado = await buscarPorEmail(email);

  if (encontrado === null) {
    await verificarContrasena(datos.contrasena, await obtenerHashDeRelleno());
    throw new AppError(MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  const { contrasena: hashGuardado, ...usuario } = encontrado;

  if (!(await verificarContrasena(datos.contrasena, hashGuardado))) {
    throw new AppError(MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  return { usuario, token: generarToken(usuario.id) };
};
