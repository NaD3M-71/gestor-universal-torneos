import {
  buscarPorEmail,
  buscarPorId,
  crearUsuario,
} from '@repositories/usuario.repository';
import { AppError } from '../../middlewares/errors/AppError';
import type { UsuarioPublico } from '../../types/usuario';
import { hashearContrasenia, verificarContrasenia } from './contrasenia';
import { generarToken } from './token';

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  email: string;
  contrasenia: string;
}

export interface DatosLogin {
  email: string;
  contrasenia: string;
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
  hashDeRelleno ??= hashearContrasenia('contrasenia-de-relleno');
  return hashDeRelleno;
};

/**
 * Registro de un organizador.
 *
 * Normaliza los datos, hashea la contraseña y guarda el usuario. Devuelve solo
 * los datos públicos. Si el email ya está registrado, el repositorio lanza un
 * AppError 409. Los datos ya vienen validados desde la capa HTTP; acá solo se
 * normalizan para que el email se guarde siempre igual (sin espacios y en
 * minúsculas), de modo que dos mayúsculas distintas no cuenten como emails
 * diferentes.
 */
export const registrarUsuario = async (
  datos: DatosRegistro
): Promise<UsuarioPublico> => {
  const contraseniaHasheada = await hashearContrasenia(datos.contrasenia);

  return crearUsuario({
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    email: datos.email.trim().toLowerCase(),
    contrasenia: contraseniaHasheada,
  });
};

/**
 * Inicio de sesión de un organizador.
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
    await verificarContrasenia(datos.contrasenia, await obtenerHashDeRelleno());
    throw new AppError(MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  const { contrasenia: hashGuardado, ...usuario } = encontrado;

  if (!(await verificarContrasenia(datos.contrasenia, hashGuardado))) {
    throw new AppError(MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  return { usuario, token: generarToken(usuario.id) };
};

/**
 * Datos del organizador con la sesión iniciada.
 * Si el usuario ya no existe (se borró después de emitirse el token), la
 * sesión deja de valer y se responde 401.
 */
export const obtenerUsuarioActual = async (
  usuarioId: number
): Promise<UsuarioPublico> => {
  const usuario = await buscarPorId(usuarioId);

  if (usuario === null) {
    throw new AppError('Sesión inválida. Iniciá sesión de nuevo.', 401);
  }

  return usuario;
};
