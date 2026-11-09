import type { UsuarioPublico } from '../../types/usuario';
import { hashearContrasenia } from './contrasenia';
import { crearUsuario } from '../../infrastructure/repositories/usuario.repository';

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  email: string;
  contrasenia: string;
}

/**
 * Caso de uso: registro de un organizador.
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
