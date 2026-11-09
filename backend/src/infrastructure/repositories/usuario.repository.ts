import { AppError } from '../../middlewares/errors/AppError';
import type {
  DatosNuevoUsuario,
  UsuarioConContrasena,
  UsuarioPublico,
} from '../../types/usuario';
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

/**
 * Busca un usuario por email, con el hash de su contraseña, para el login.
 * Devuelve null si no existe. El email se busca tal cual: el caso de uso ya
 * lo normaliza (sin espacios y en minúsculas), igual que al registrarse.
 */
export const buscarPorEmail = async (
  email: string
): Promise<UsuarioConContrasena | null> => {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      contrasenia: true,
    },
  });

  if (usuario === null) {
    return null;
  }

  const { contrasenia, ...datosPublicos } = usuario;
  return { ...datosPublicos, contrasena: contrasenia };
};
