import { hash } from 'bcryptjs';

// Costo del hash: cada punto más duplica el tiempo de cálculo. 10 es el valor
// habitual y alcanza para un proyecto de este tamaño.
const COSTO_HASH = 10;

/**
 * Devuelve el hash bcrypt de una contraseña en texto plano. Es lo único que
 * se guarda en la columna usuarios.contrasena.
 */
export const hashearContrasena = (contrasena: string): Promise<string> =>
  hash(contrasena, COSTO_HASH);
