import { AppError } from '../../errors/AppError';
import type {
  DatosNuevoUsuario,
  UsuarioPublico,
} from '../../domain/usuarios/usuario';
import { prisma } from '../database';
import { Prisma } from '../database/prisma/client';

// Código de Prisma para una violación de restricción única.
const CODIGO_VALOR_DUPLICADO = 'P2002';

/**
 * Guarda un usuario nuevo y devuelve sus datos públicos (sin contraseña).
 * Si el email ya existe lanza un 409: la restricción única de la base es la
 * que decide, así que también cubre dos registros simultáneos.
 */
export const crearUsuario = async (
  datos: DatosNuevoUsuario
): Promise<UsuarioPublico> => {
  try {
    return await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        // En la base la columna se llama contrasenia.
        contrasenia: datos.contrasena,
      },
      select: { id: true, nombre: true, apellido: true, email: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === CODIGO_VALOR_DUPLICADO
    ) {
      throw new AppError('Ya existe un usuario registrado con ese email.', 409);
    }
    throw error;
  }
};
