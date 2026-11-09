/**
 * Datos de un organizador tal como los devuelve la API: nunca incluyen la
 * contraseña ni su hash.
 */
export interface UsuarioPublico {
  id: number;
  nombre: string;
  apellido: string;
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
  contrasena: string;
}