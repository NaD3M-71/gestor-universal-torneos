import { compare, hash } from 'bcryptjs';

// Costo del hash: cada punto más duplica el tiempo de cálculo. 10 es el valor
// habitual y alcanza para un proyecto de este tamaño.
const COSTO_HASH = 10;

/**
 * Devuelve el hash bcrypt de una contraseña en texto plano. Es lo único que
 * se guarda en la columna usuarios.contrasenia.
 */
export const hashearContrasenia = (contrasenia: string): Promise<string> =>
  hash(contrasenia, COSTO_HASH);

/** Indica si una contraseña en texto plano corresponde a un hash guardado. */
export const verificarContrasenia = (
  contrasenia: string,
  hashGuardado: string
): Promise<boolean> => compare(contrasenia, hashGuardado);
