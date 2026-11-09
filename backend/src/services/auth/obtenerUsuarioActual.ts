import { AppError } from '../../middlewares/errors/AppError';
import type { UsuarioPublico } from '../../types/usuario';
import { buscarPorId } from '../../infrastructure/repositories/usuario.repository';

/**
 * Caso de uso: datos del organizador con la sesión iniciada.
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