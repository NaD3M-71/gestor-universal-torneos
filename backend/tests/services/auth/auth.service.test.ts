import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compare, hash } from 'bcryptjs';
import {
  buscarPorEmail,
  buscarPorId,
  crearUsuario,
} from '@repositories/usuario.repository';
import {
  iniciarSesion,
  obtenerUsuarioActual,
  registrarUsuario,
} from '@services/auth/auth.service';
import { generarToken } from '@services/auth/token';
import { AppError } from '../../../src/middlewares/errors/AppError';

// Se reemplazan el repositorio (sin base de datos) y el token (así no se carga
// config/env, que exige variables de entorno).
vi.mock('@repositories/usuario.repository', () => ({
  crearUsuario: vi.fn(),
  buscarPorEmail: vi.fn(),
  buscarPorId: vi.fn(),
}));
vi.mock('@services/auth/token', () => ({
  generarToken: vi.fn(),
}));

const crearUsuarioMock = vi.mocked(crearUsuario);
const buscarPorEmailMock = vi.mocked(buscarPorEmail);
const buscarPorIdMock = vi.mocked(buscarPorId);
const generarTokenMock = vi.mocked(generarToken);

describe('registrarUsuario', () => {
  const datos = {
    nombre: '  Valeria ',
    apellido: ' Giménez  ',
    email: '  Valeria@Test.COM ',
    contrasenia: 'unaclavelarga123',
  };

  beforeEach(() => {
    crearUsuarioMock.mockReset();
    crearUsuarioMock.mockResolvedValue({
      id: 1,
      nombre: 'Valeria',
      apellido: 'Giménez',
      email: 'valeria@test.com',
    });
  });

  it('guarda el email sin espacios y en minúsculas, y nombre y apellido sin espacios', async () => {
    await registrarUsuario(datos);

    const guardado = crearUsuarioMock.mock.calls[0]![0];
    expect(guardado.nombre).toBe('Valeria');
    expect(guardado.apellido).toBe('Giménez');
    expect(guardado.email).toBe('valeria@test.com');
  });

  it('no guarda la contraseña en texto plano: guarda un hash que la verifica', async () => {
    await registrarUsuario(datos);

    const guardado = crearUsuarioMock.mock.calls[0]![0];
    expect(guardado.contrasenia).not.toBe(datos.contrasenia);
    expect(await compare(datos.contrasenia, guardado.contrasenia)).toBe(true);
  });

  it('devuelve los datos públicos que entrega el repositorio', async () => {
    const usuario = await registrarUsuario(datos);

    expect(usuario).toEqual({
      id: 1,
      nombre: 'Valeria',
      apellido: 'Giménez',
      email: 'valeria@test.com',
    });
    expect(usuario).not.toHaveProperty('contrasenia');
  });

  it('deja pasar el error del repositorio cuando el email ya existe', async () => {
    const error = new Error('Ya existe un usuario registrado con ese email.');
    crearUsuarioMock.mockRejectedValue(error);

    await expect(registrarUsuario(datos)).rejects.toBe(error);
  });
});

describe('iniciarSesion', () => {
  const contrasenia = 'unaclavelarga123';
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

describe('obtenerUsuarioActual', () => {
  beforeEach(() => {
    buscarPorIdMock.mockReset();
  });

  it('devuelve los datos públicos del usuario', async () => {
    const usuario = {
      id: 7,
      nombre: 'Valeria',
      apellido: 'Giménez',
      email: 'valeria@test.com',
    };
    buscarPorIdMock.mockResolvedValue(usuario);

    await expect(obtenerUsuarioActual(7)).resolves.toEqual(usuario);
    expect(buscarPorIdMock).toHaveBeenCalledWith(7);
  });

  it('responde 401 si el usuario ya no existe', async () => {
    buscarPorIdMock.mockResolvedValue(null);

    await expect(obtenerUsuarioActual(7)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
