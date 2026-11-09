import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compare } from 'bcryptjs';
import { registrarUsuario } from '../../../src/services/auth/registrarUsuario';
import { crearUsuario } from '../../../src/infrastructure/repositories/usuario.repository';

// Se reemplaza el repositorio para no necesitar una base de datos.
vi.mock('../../../src/infrastructure/repositories/usuario.repository', () => ({
  crearUsuario: vi.fn(),
}));

const crearUsuarioMock = vi.mocked(crearUsuario);

const datos = {
  nombre: '  Valeria ',
  apellido: ' Giménez  ',
  email: '  Valeria@Test.COM ',
  contrasenia: 'unaclavelarga123',
};

describe('registrarUsuario', () => {
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
