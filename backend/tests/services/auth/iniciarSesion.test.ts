import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hash } from 'bcryptjs';
import { iniciarSesion } from '../../../src/services/auth/iniciarSesion';
import { AppError } from '../../../src/middlewares/errors/AppError';
import { buscarPorEmail } from '../../../src/infrastructure/repositories/usuario.repository';
import { generarToken } from '../../../src/services/auth/token';

// Se reemplazan el repositorio (sin base de datos) y el token (así no se carga
// config/env, que exige variables de entorno).
vi.mock('../../../src/infrastructure/repositories/usuario.repository', () => ({
  buscarPorEmail: vi.fn(),
}));
vi.mock('../../../src/services/auth/token', () => ({
  generarToken: vi.fn(),
}));

const buscarPorEmailMock = vi.mocked(buscarPorEmail);
const generarTokenMock = vi.mocked(generarToken);

const contrasenia = 'unaclavelarga123';

describe('iniciarSesion', () => {
  let hashGuardado: string;

  beforeEach(async () => {
    hashGuardado = await hash(contrasenia, 4);
    buscarPorEmailMock.mockReset();
    generarTokenMock.mockReset();
    generarTokenMock.mockReturnValue('token-de-prueba');
    buscarPorEmailMock.mockResolvedValue({
      id: 7,
      nombre: 'Valeria',
      apellido: 'Giménez',
      email: 'valeria@test.com',
      contrasenia: hashGuardado,
    });
  });

  it('con credenciales correctas devuelve el token y los datos públicos, sin la contraseña', async () => {
    const resultado = await iniciarSesion({
      email: 'valeria@test.com',
      contrasenia: contrasenia,
    });

    expect(resultado.token).toBe('token-de-prueba');
    expect(resultado.usuario).toEqual({
      id: 7,
      nombre: 'Valeria',
      apellido: 'Giménez',
      email: 'valeria@test.com',
    });
    expect(resultado.usuario).not.toHaveProperty('contrasenia');
    expect(generarTokenMock).toHaveBeenCalledWith(7);
  });

  it('busca el email sin espacios y en minúsculas', async () => {
    await iniciarSesion({
      email: '  Valeria@Test.COM ',
      contrasenia: contrasenia,
    });

    expect(buscarPorEmailMock).toHaveBeenCalledWith('valeria@test.com');
  });

  it('con una contraseña incorrecta lanza 401 y no genera token', async () => {
    const promesa = iniciarSesion({
      email: 'valeria@test.com',
      contrasenia: 'otraclavecualquiera',
    });

    await expect(promesa).rejects.toMatchObject({
      statusCode: 401,
      message: 'Email o contraseña incorrectos.',
    });
    expect(generarTokenMock).not.toHaveBeenCalled();
  });

  it('con un email que no existe lanza el mismo 401 y no genera token', async () => {
    buscarPorEmailMock.mockResolvedValue(null);

    const promesa = iniciarSesion({
      email: 'nadie@test.com',
      contrasenia: contrasenia,
    });

    await expect(promesa).rejects.toBeInstanceOf(AppError);
    await expect(promesa).rejects.toMatchObject({
      statusCode: 401,
      message: 'Email o contraseña incorrectos.',
    });
    expect(generarTokenMock).not.toHaveBeenCalled();
  });
});
