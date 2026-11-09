import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { autenticar } from '../../src/middlewares/autenticar';
import { AppError } from '../../src/middlewares/errors/AppError';
import { verificarToken } from '../../src/services/auth/token';

// Se reemplaza el módulo del token (así no se carga config/env). Acá solo
// interesa cómo el middleware usa verificarToken, no cómo verifica.
vi.mock('../../src/services/auth/token', () => ({
  NOMBRE_COOKIE_SESION: 'token',
  verificarToken: vi.fn(),
}));

const verificarTokenMock = vi.mocked(verificarToken);

const pedido = (cookies?: Record<string, unknown>): Request =>
  ({ cookies }) as unknown as Request;

const respuesta = {} as Response;

describe('autenticar', () => {
  let next: NextFunction;

  beforeEach(() => {
    verificarTokenMock.mockReset();
    next = vi.fn();
  });

  it('con cookie válida carga req.usuarioId y sigue con next', () => {
    verificarTokenMock.mockReturnValue(7);
    const req = pedido({ token: 'token-valido' });

    autenticar(req, respuesta, next);

    expect(verificarTokenMock).toHaveBeenCalledWith('token-valido');
    expect(req.usuarioId).toBe(7);
    expect(next).toHaveBeenCalledOnce();
  });

  it('sin cookies lanza un 401 y no sigue', () => {
    expect(() => autenticar(pedido(undefined), respuesta, next)).toThrow(
      AppError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('sin la cookie de sesión lanza un 401', () => {
    try {
      autenticar(pedido({ otra: 'x' }), respuesta, next);
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).statusCode).toBe(401);
    }
    expect(verificarTokenMock).not.toHaveBeenCalled();
  });

  it('con la cookie vacía lanza un 401', () => {
    expect(() => autenticar(pedido({ token: '' }), respuesta, next)).toThrow(
      AppError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('si el token es inválido deja pasar el error de verificarToken y no sigue', () => {
    verificarTokenMock.mockImplementation(() => {
      throw new AppError('Sesión inválida. Iniciá sesión de nuevo.', 401);
    });

    expect(() =>
      autenticar(pedido({ token: 'roto' }), respuesta, next)
    ).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });
});