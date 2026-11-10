/**
 * Datos de un organizador tal como los devuelve la API: nunca incluyen la
 * contraseña ni su hash.
 */
export interface UsuarioPublico {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
}

/**
 * Datos necesarios para guardar un usuario nuevo. La contraseña llega ya
 * hasheada: el texto plano nunca se guarda ni sale del caso de uso.
 */
export interface DatosNuevoUsuario {
  nombre: string;
  apellido: string;
  email: string;
  contrasenia: string;
}

/**
 * Usuario junto con el hash de su contraseña. Solo lo usa el login para
 * comparar la contraseña; nunca debe salir de la capa de servicios.
 */
export interface UsuarioConContrasenia extends UsuarioPublico {
  contrasenia: string;
}
