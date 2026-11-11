import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as equipoRepository from '@repositories/equipo.repository';
import {
  actualizarEquipo,
  asignarGrupos,
  crearEquipo,
  eliminarEquipo,
  listarEquipos,
  sortearGrupos,
} from '@services/equipo.service';
import { obtenerTorneo } from '@services/torneos/torneo.service';
import { AppError } from '../../../src/middlewares/errors/AppError';
import type { EquipoPublico } from '../../../src/types/equipo';
import type { TorneoPublico } from '../../../src/types/torneo';

// Se reemplazan el repositorio de equipos (sin base de datos) y la búsqueda de
// torneos, que ya tiene sus propios tests.
vi.mock('@repositories/equipo.repository', () => ({
  crearEquipo: vi.fn(),
  listarEquiposDeTorneo: vi.fn(),
  buscarEquipoPorId: vi.fn(),
  actualizarEquipo: vi.fn(),
  eliminarEquipo: vi.fn(),
  contarEquiposDeTorneo: vi.fn(),
  existeEquipoConNombre: vi.fn(),
  reemplazarGrupos: vi.fn(),
}));
vi.mock('@services/torneos/torneo.service', () => ({
  obtenerTorneo: vi.fn(),
}));

const crearMock = vi.mocked(equipoRepository.crearEquipo);
const listarMock = vi.mocked(equipoRepository.listarEquiposDeTorneo);
const buscarMock = vi.mocked(equipoRepository.buscarEquipoPorId);
const actualizarMock = vi.mocked(equipoRepository.actualizarEquipo);
const eliminarMock = vi.mocked(equipoRepository.eliminarEquipo);
const contarMock = vi.mocked(equipoRepository.contarEquiposDeTorneo);
const existeNombreMock = vi.mocked(equipoRepository.existeEquipoConNombre);
const reemplazarMock = vi.mocked(equipoRepository.reemplazarGrupos);
const obtenerTorneoMock = vi.mocked(obtenerTorneo);

const USUARIO_ID = 7;
const TORNEO_ID = 1;
const EQUIPO_ID = 10;

const torneo: TorneoPublico = {
  id: TORNEO_ID,
  creadorId: USUARIO_ID,
  nombre: 'Liga nocturna',
  descripcion: null,
  formato: 'liga_simple',
  sistemaPuntuacion: 'futbol_clasico',
  cantidadParticipantes: 4,
  cantidadGrupos: null,
  fechaInicio: null,
  estado: 'borrador',
  campeonId: null,
};

const equipo: EquipoPublico = {
  id: EQUIPO_ID,
  torneoId: TORNEO_ID,
  nombre: 'Los Pumas',
  grupo: null,
  integrantes: [{ id: 1, nombre: 'Ana' }],
};

const torneoConGrupos: TorneoPublico = {
  ...torneo,
  formato: 'grupos_eliminatorias',
  cantidadParticipantes: 8,
  cantidadGrupos: 2,
};

/** n equipos del torneo, con ids 1..n. */
const variosEquipos = (n: number): EquipoPublico[] =>
  Array.from({ length: n }, (_, i) => ({
    ...equipo,
    id: i + 1,
    nombre: `Equipo ${i + 1}`,
  }));

beforeEach(() => {
  vi.resetAllMocks();
  obtenerTorneoMock.mockResolvedValue(torneo);
  contarMock.mockResolvedValue(0);
  existeNombreMock.mockResolvedValue(false);
  buscarMock.mockResolvedValue(equipo);
  crearMock.mockResolvedValue(equipo);
  actualizarMock.mockResolvedValue(equipo);
  listarMock.mockResolvedValue([equipo]);
  reemplazarMock.mockResolvedValue([equipo]);
});

describe('crearEquipo', () => {
  it('guarda el nombre y los integrantes sin espacios sobrantes', async () => {
    await crearEquipo(TORNEO_ID, USUARIO_ID, {
      nombre: '  Los Pumas ',
      integrantes: [' Ana ', 'Luis  '],
    });

    expect(crearMock).toHaveBeenCalledWith(TORNEO_ID, {
      nombre: 'Los Pumas',
      integrantes: ['Ana', 'Luis'],
    });
  });

  it('sin integrantes guarda un equipo de un solo jugador (lista vacía)', async () => {
    await crearEquipo(TORNEO_ID, USUARIO_ID, { nombre: 'Ana' });

    expect(crearMock).toHaveBeenCalledWith(TORNEO_ID, {
      nombre: 'Ana',
      integrantes: [],
    });
  });

  it('devuelve el equipo que entrega el repositorio', async () => {
    await expect(
      crearEquipo(TORNEO_ID, USUARIO_ID, { nombre: 'Los Pumas' })
    ).resolves.toEqual(equipo);
  });

  it('deja pasar el 404 si el torneo no existe o es de otro organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    await expect(
      crearEquipo(TORNEO_ID, USUARIO_ID, { nombre: 'Los Pumas' })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(crearMock).not.toHaveBeenCalled();
  });

  it.each(['en_curso', 'finalizado'] as const)(
    'responde 409 y no guarda si el torneo está %s',
    async (estado) => {
      obtenerTorneoMock.mockResolvedValue({ ...torneo, estado });

      await expect(
        crearEquipo(TORNEO_ID, USUARIO_ID, { nombre: 'Los Pumas' })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(crearMock).not.toHaveBeenCalled();
    }
  );

  it('responde 409 y no guarda si ya están inscriptos todos los participantes', async () => {
    contarMock.mockResolvedValue(4);

    await expect(
      crearEquipo(TORNEO_ID, USUARIO_ID, { nombre: 'Los Pumas' })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('deja inscribir el último participante que falta', async () => {
    contarMock.mockResolvedValue(3);

    await crearEquipo(TORNEO_ID, USUARIO_ID, { nombre: 'Los Pumas' });

    expect(crearMock).toHaveBeenCalledTimes(1);
  });

  it('responde 409 y no guarda si el nombre ya existe en el torneo', async () => {
    existeNombreMock.mockResolvedValue(true);

    await expect(
      crearEquipo(TORNEO_ID, USUARIO_ID, { nombre: ' los pumas ' })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(existeNombreMock).toHaveBeenCalledWith(
      TORNEO_ID,
      'los pumas',
      undefined
    );
    expect(crearMock).not.toHaveBeenCalled();
  });
});

describe('listarEquipos', () => {
  it('devuelve los equipos del torneo', async () => {
    listarMock.mockResolvedValue([equipo]);

    await expect(listarEquipos(TORNEO_ID, USUARIO_ID)).resolves.toEqual([
      equipo,
    ]);
    expect(obtenerTorneoMock).toHaveBeenCalledWith(TORNEO_ID, USUARIO_ID);
  });

  it('también lista si el torneo ya no está en borrador', async () => {
    obtenerTorneoMock.mockResolvedValue({ ...torneo, estado: 'en_curso' });
    listarMock.mockResolvedValue([equipo]);

    await expect(listarEquipos(TORNEO_ID, USUARIO_ID)).resolves.toEqual([
      equipo,
    ]);
  });

  it('deja pasar el 404 si el torneo es de otro organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    await expect(listarEquipos(TORNEO_ID, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(listarMock).not.toHaveBeenCalled();
  });
});

describe('actualizarEquipo', () => {
  it('envía solo lo recibido, sin espacios sobrantes', async () => {
    await actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, {
      nombre: '  Los Pumas B ',
    });

    expect(actualizarMock).toHaveBeenCalledWith(EQUIPO_ID, {
      nombre: 'Los Pumas B',
    });
  });

  it('reemplaza la lista de integrantes (puede quedar vacía)', async () => {
    await actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, {
      integrantes: [' Luis '],
    });
    await actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, {
      integrantes: [],
    });

    expect(actualizarMock).toHaveBeenNthCalledWith(1, EQUIPO_ID, {
      integrantes: ['Luis'],
    });
    expect(actualizarMock).toHaveBeenNthCalledWith(2, EQUIPO_ID, {
      integrantes: [],
    });
  });

  it('al comprobar el nombre ignora al propio equipo', async () => {
    await actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, {
      nombre: 'LOS PUMAS',
    });

    expect(existeNombreMock).toHaveBeenCalledWith(
      TORNEO_ID,
      'LOS PUMAS',
      EQUIPO_ID
    );
  });

  it('responde 409 y no modifica si el nombre ya lo tiene otro equipo', async () => {
    existeNombreMock.mockResolvedValue(true);

    await expect(
      actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, { nombre: 'Otro' })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it('responde 404 si el equipo no existe', async () => {
    buscarMock.mockResolvedValue(null);

    await expect(
      actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, { nombre: 'Otro' })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it('responde 404 si el equipo es de otro torneo', async () => {
    buscarMock.mockResolvedValue({ ...equipo, torneoId: 99 });

    await expect(
      actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, { nombre: 'Otro' })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it('responde 409 y no modifica si el torneo ya no está en borrador', async () => {
    obtenerTorneoMock.mockResolvedValue({ ...torneo, estado: 'en_curso' });

    await expect(
      actualizarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID, { nombre: 'Otro' })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });
});

describe('eliminarEquipo', () => {
  it('borra un equipo del torneo en borrador', async () => {
    await eliminarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID);

    expect(eliminarMock).toHaveBeenCalledWith(EQUIPO_ID);
  });

  it('responde 404 y no borra si el equipo es de otro torneo', async () => {
    buscarMock.mockResolvedValue({ ...equipo, torneoId: 99 });

    await expect(
      eliminarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(eliminarMock).not.toHaveBeenCalled();
  });

  it('responde 409 y no borra si el torneo ya no está en borrador', async () => {
    obtenerTorneoMock.mockResolvedValue({ ...torneo, estado: 'finalizado' });

    await expect(
      eliminarEquipo(TORNEO_ID, EQUIPO_ID, USUARIO_ID)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(eliminarMock).not.toHaveBeenCalled();
  });
});

describe('asignarGrupos', () => {
  beforeEach(() => {
    obtenerTorneoMock.mockResolvedValue(torneoConGrupos);
    listarMock.mockResolvedValue(variosEquipos(4));
  });

  it('reemplaza los grupos del torneo con la lista recibida', async () => {
    const asignaciones = [
      { equipoId: 1, grupo: 1 },
      { equipoId: 2, grupo: 2 },
      { equipoId: 3, grupo: null },
    ];

    await asignarGrupos(TORNEO_ID, USUARIO_ID, asignaciones);

    expect(reemplazarMock).toHaveBeenCalledWith(TORNEO_ID, asignaciones);
  });

  it('acepta un reparto libre, sin tope de equipos por grupo', async () => {
    const asignaciones = [1, 2, 3, 4].map((equipoId) => ({
      equipoId,
      grupo: 1,
    }));

    await asignarGrupos(TORNEO_ID, USUARIO_ID, asignaciones);

    expect(reemplazarMock).toHaveBeenCalledWith(TORNEO_ID, asignaciones);
  });

  it('con una lista vacía deja a todos los equipos sin grupo', async () => {
    await asignarGrupos(TORNEO_ID, USUARIO_ID, []);

    expect(reemplazarMock).toHaveBeenCalledWith(TORNEO_ID, []);
  });

  it('responde 400 con el detalle si el grupo supera la cantidad de grupos', async () => {
    await expect(
      asignarGrupos(TORNEO_ID, USUARIO_ID, [{ equipoId: 1, grupo: 3 }])
    ).rejects.toMatchObject({
      statusCode: 400,
      detalles: [{ campo: 'asignaciones[0].grupo' }],
    });
    expect(reemplazarMock).not.toHaveBeenCalled();
  });

  it('responde 400 si un equipo no es del torneo', async () => {
    await expect(
      asignarGrupos(TORNEO_ID, USUARIO_ID, [{ equipoId: 99, grupo: 1 }])
    ).rejects.toMatchObject({
      statusCode: 400,
      detalles: [{ campo: 'asignaciones[0].equipoId' }],
    });
    expect(reemplazarMock).not.toHaveBeenCalled();
  });

  it('responde 400 si un equipo se repite en la lista', async () => {
    await expect(
      asignarGrupos(TORNEO_ID, USUARIO_ID, [
        { equipoId: 1, grupo: 1 },
        { equipoId: 1, grupo: 2 },
      ])
    ).rejects.toMatchObject({
      statusCode: 400,
      detalles: [{ campo: 'asignaciones[1].equipoId' }],
    });
    expect(reemplazarMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el torneo no usa grupos', async () => {
    obtenerTorneoMock.mockResolvedValue(torneo);

    await expect(
      asignarGrupos(TORNEO_ID, USUARIO_ID, [])
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(reemplazarMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el torneo ya no está en borrador', async () => {
    obtenerTorneoMock.mockResolvedValue({
      ...torneoConGrupos,
      estado: 'en_curso',
    });

    await expect(
      asignarGrupos(TORNEO_ID, USUARIO_ID, [])
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(reemplazarMock).not.toHaveBeenCalled();
  });

  it('responde 404 si el torneo no es del organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    await expect(
      asignarGrupos(TORNEO_ID, USUARIO_ID, [])
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('sortearGrupos', () => {
  const gruposSorteados = (): number[] => {
    const asignaciones = reemplazarMock.mock.calls[0]?.[1] ?? [];
    return asignaciones.map(({ grupo }) => grupo as number);
  };

  beforeEach(() => {
    obtenerTorneoMock.mockResolvedValue(torneoConGrupos);
  });

  it('asigna un grupo a cada equipo, sin repetir equipos', async () => {
    listarMock.mockResolvedValue(variosEquipos(7));

    await sortearGrupos(TORNEO_ID, USUARIO_ID);

    const asignaciones = reemplazarMock.mock.calls[0]?.[1] ?? [];
    expect(asignaciones.map(({ equipoId }) => equipoId).sort()).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(gruposSorteados().every((g) => g === 1 || g === 2)).toBe(true);
  });

  it('reparte parejo: los grupos difieren como mucho en un equipo', async () => {
    listarMock.mockResolvedValue(variosEquipos(7));

    await sortearGrupos(TORNEO_ID, USUARIO_ID);

    const grupos = gruposSorteados();
    const enGrupo1 = grupos.filter((g) => g === 1).length;
    const enGrupo2 = grupos.filter((g) => g === 2).length;
    expect(Math.abs(enGrupo1 - enGrupo2)).toBeLessThanOrEqual(1);
  });

  it('con 4 grupos y 8 equipos deja 2 en cada uno', async () => {
    obtenerTorneoMock.mockResolvedValue({
      ...torneoConGrupos,
      cantidadGrupos: 4,
    });
    listarMock.mockResolvedValue(variosEquipos(8));

    await sortearGrupos(TORNEO_ID, USUARIO_ID);

    const grupos = gruposSorteados();
    [1, 2, 3, 4].forEach((g) =>
      expect(grupos.filter((x) => x === g)).toHaveLength(2)
    );
  });

  it('sin equipos inscriptos no asigna nada', async () => {
    listarMock.mockResolvedValue([]);

    await sortearGrupos(TORNEO_ID, USUARIO_ID);

    expect(reemplazarMock).toHaveBeenCalledWith(TORNEO_ID, []);
  });

  it('devuelve los equipos que entrega el repositorio', async () => {
    listarMock.mockResolvedValue(variosEquipos(2));

    await expect(sortearGrupos(TORNEO_ID, USUARIO_ID)).resolves.toEqual([
      equipo,
    ]);
  });

  it('responde 409 si el torneo no usa grupos', async () => {
    obtenerTorneoMock.mockResolvedValue(torneo);

    await expect(sortearGrupos(TORNEO_ID, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(reemplazarMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el torneo ya no está en borrador', async () => {
    obtenerTorneoMock.mockResolvedValue({
      ...torneoConGrupos,
      estado: 'finalizado',
    });

    await expect(sortearGrupos(TORNEO_ID, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
