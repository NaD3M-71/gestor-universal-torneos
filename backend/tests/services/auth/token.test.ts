import { describe, expect, it, vi } from 'vitest';
import { sign } from 'jsonwebtoken';
import { AppError } from '../../../src/middlewares/errors/AppError';
import {
  generarToken,
  verificarToken,
} from '../../../src/services/auth/token';

// Se reemplaza config/env para no depender de variables de entorno reales.
vi.mock('../../../src/config/env', () => ({
  env: { JWT_SECRET: 'secreto-de-prueba' },
}));

const SECRETO = 'secreto-de-prueba';

// Ejecuta la acción y devuelve el error que lanzó (o undefined si no lanzó).
const errorDe = (accion: () => unknown): unknown => {
  try {
    accion();
  } catch (error) {
    return error;
  }
  return undefined;
};

const esperar401 = (accion: () => unknown): AppError => {
  const error = errorDe(accion);
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).statusCode).toBe(401);
  return error as AppError;
};

describe('verificarToken', () => {
  it('devuelve el id del usuario de un token generado por generarToken', () => {
    expect(verificarToken(generarToken(7))).toBe(7);
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = sign({}, 'otro-secreto', { subject: '7', expiresIn: 60 });
    esperar401(() => verificarToken(token));
  });

  it('rechaza un token vencido con el mensaje de sesión vencida', () => {
    const token = sign({}, SECRETO, { subject: '7', expiresIn: -10 });
    const error = esperar401(() => verificarToken(token));
    expect(error.message).toContain('venció');
  });

  it('rechaza un texto que no es un token', () => {
    esperar401(() => verificarToken('esto-no-es-un-token'));
  });

  it('rechaza un token sin firma (algoritmo none)', () => {
    const codificar = (objeto: object): string =>
      Buffer.from(JSON.stringify(objeto)).toString('base64url');
    const token = `${codificar({ alg: 'none', typ: 'JWT' })}.${codificar({ sub: '7' })}.`;
    esperar401(() => verificarToken(token));
  });

  it('rechaza un token firmado bien pero sin "sub"', () => {
    const token = sign({}, SECRETO, { expiresIn: 60 });
    esperar401(() => verificarToken(token));
  });

  it('rechaza un token cuyo "sub" no es un id numérico válido', () => {
    esperar401(() =>
      verificarToken(sign({}, SECRETO, { subject: 'abc', expiresIn: 60 }))
    );
    esperar401(() =>
      verificarToken(sign({}, SECRETO, { subject: '0', expiresIn: 60 }))
    );
  });
});