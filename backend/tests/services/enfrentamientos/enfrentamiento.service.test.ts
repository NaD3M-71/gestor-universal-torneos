import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as enfrentamientoRepository from '@repositories/enfrentamiento.repository';
import {
  cargarResultado,
  validarDatosResultado,
} from '@services/enfrentamientos/enfrentamiento.service';
import { obtenerTorneo } from '@services/torneos/torneo.service';
import { AppError } from '../../../src/middlewares/errors/AppError';
import type { ErrorValidacion } from '../../../src/middlewares/errors/ErrorValidacion';
import type {
  DatosResultado,
  EnfrentamientoConFase,
} from '../../../src/types/enfrentamiento';
import type { TorneoPublico } from '../../../src/types/torneo';

// Se reemplazan el repositorio (sin base de datos) y la búsqueda de torneos,
// que ya tiene sus propios tests.
vi.mock('@repositories/enfrentamiento.repository', () => ({
  buscarEnfrentamientoConFase: vi.fn(),
  guardarResultado: vi.fn(),
}));
vi.mock('@services/torneos/torneo.service', () => ({
  obtenerTorneo: vi.fn(),
}));

const buscarMock = vi.mocked(
  enfrentamientoRepository.buscarEnfrentamientoConFase
);
const guardarMock = vi.mocked(enfrentamientoRepository.guardarResultado);
const obtenerTorneoMock = vi.mocked(obtenerTorneo);

const USUARIO_ID = 7;
const TORNEO_ID = 1;
const ENFRENTAMIENTO_ID = 5;
const EQUIPO_A = 10;
const EQUIPO_B = 20;

const torneoEnCurso: TorneoPublico = {
  id: TORNEO_ID,
  creadorId: USUARIO_ID,
  nombre: 'Liga nocturna',
  descripcion: null,
  formato: 'liga_simple',
  sistemaPuntuacion: 'futbol_clasico',
  cantidadParticipantes: 4,
  cantidadGrupos: null,
  fechaInicio: null,
  estado: 'en_curso',
  campeonId: null,
};

const enfrentamiento: EnfrentamientoConFase = {
  id: ENFRENTAMIENTO_ID,
  faseId: 3,
  equipoAId: EQUIPO_A,
  equipoBId: EQUIPO_B,
  resultadoA: null,
  resultadoB: null,
  instancia: 'fecha_1',
  ganadorId: null,
  comentario: null,
  fase: { id: 3, torneoId: TORNEO_ID, tipo: 'liga', estado: 'activa' },
};

/** Detalles del ErrorValidacion que lanza la función (vacío si no lanza). */
const detallesDe = (datos: DatosResultado) => {
  try {
    validarDatosResultado(datos);
  } catch (error) {
    return (error as ErrorValidacion).detalles;
  }
  return [];
};

const cargar = (datos: DatosResultado) =>
  cargarResultado(TORNEO_ID, ENFRENTAMIENTO_ID, USUARIO_ID, datos);

beforeEach(() => {
  vi.resetAllMocks();
  obtenerTorneoMock.mockResolvedValue(torneoEnCurso);
  buscarMock.mockResolvedValue(enfrentamiento);
  guardarMock.mockImplementation(async (id, resultado) => ({
    ...enfrentamiento,
    ...resultado,
    id,
  }));
});

describe('validarDatosResultado', () => {
  it.each([
    ['un ganador', { ganadorId: EQUIPO_A }],
    ['un empate', { empate: true }],
    ['un ganador con marcador', { ganadorId: EQUIPO_A, resultadoA: 2, resultadoB: 1 }],
    ['un empate con marcador', { empate: true, resultadoA: 1, resultadoB: 1 }],
  ] as [string, DatosResultado][])('acepta %s', (_, datos) => {
    expect(detallesDe(datos)).toEqual([]);
  });

  it('no compara el marcador con el ganador (en el golf gana el menor puntaje)', () => {
    expect(
      detallesDe({ ganadorId: EQUIPO_A, resultadoA: 68, resultadoB: 72 })
    ).toEqual([]);
  });

  it.each([
    ['sin ganador ni empate', {}],
    ['con ganador y empate a la vez', { ganadorId: EQUIPO_A, empate: true }],
    ['con empate en false y sin ganador', { empate: false }],
  ] as [string, DatosResultado][])('rechaza un cuerpo %s', (_, datos) => {
    expect(detallesDe(datos).map((d) => d.campo)).toEqual(['ganadorId']);
  });

  it.each([
    ['solo resultadoA', { empate: true, resultadoA: 1 }],
    ['solo resultadoB', { empate: true, resultadoB: 1 }],
  ] as [string, DatosResultado][])(
    'rechaza un marcador incompleto (%s)',
    (_, datos) => {
      expect(detallesDe(datos).map((d) => d.campo)).toEqual(['resultadoA']);
    }
  );

  it('informa todos los errores juntos', () => {
    expect(detallesDe({ resultadoA: 1 }).map((d) => d.campo)).toEqual([
      'ganadorId',
      'resultadoA',
    ]);
  });
});

describe('cargarResultado', () => {
  it('guarda un ganador sin marcador', async () => {
    const resultado = await cargar({ ganadorId: EQUIPO_A });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: EQUIPO_A,
      resultadoA: null,
      resultadoB: null,
    });
    expect(resultado.ganadorId).toBe(EQUIPO_A);
  });

  it('guarda un ganador con su marcador', async () => {
    await cargar({ ganadorId: EQUIPO_B, resultadoA: 1, resultadoB: 3 });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: EQUIPO_B,
      resultadoA: 1,
      resultadoB: 3,
    });
  });

  it('respeta al ganador aunque tenga el marcador menor', async () => {
    await cargar({ ganadorId: EQUIPO_A, resultadoA: 68, resultadoB: 72 });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: EQUIPO_A,
      resultadoA: 68,
      resultadoB: 72,
    });
  });

  it('guarda un empate sin marcador como 0-0, sin ganador', async () => {
    await cargar({ empate: true });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: null,
      resultadoA: 0,
      resultadoB: 0,
    });
  });

  it('guarda un empate con el marcador que se informe', async () => {
    await cargar({ empate: true, resultadoA: 2, resultadoB: 2 });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: null,
      resultadoA: 2,
      resultadoB: 2,
    });
  });

  it('permite corregir: volver a cargar sobrescribe el resultado anterior', async () => {
    await cargar({ ganadorId: EQUIPO_A, resultadoA: 2, resultadoB: 0 });
    await cargar({ empate: true });

    expect(guardarMock).toHaveBeenCalledTimes(2);
    expect(guardarMock).toHaveBeenLastCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: null,
      resultadoA: 0,
      resultadoB: 0,
    });
  });

  it('responde 400 con un cuerpo inválido y no consulta nada', async () => {
    await expect(cargar({})).rejects.toMatchObject({ statusCode: 400 });

    expect(obtenerTorneoMock).not.toHaveBeenCalled();
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 404 si el torneo no existe o es de otro organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    await expect(cargar({ empate: true })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 404 si el enfrentamiento no existe', async () => {
    buscarMock.mockResolvedValue(null);

    await expect(cargar({ empate: true })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 404 si el enfrentamiento es de otro torneo', async () => {
    buscarMock.mockResolvedValue({
      ...enfrentamiento,
      fase: { ...enfrentamiento.fase, torneoId: 99 },
    });

    await expect(cargar({ empate: true })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it.each(['borrador', 'finalizado', 'cancelado'] as const)(
    'responde 409 si el torneo está %s',
    async (estado) => {
      obtenerTorneoMock.mockResolvedValue({ ...torneoEnCurso, estado });

      await expect(cargar({ empate: true })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(guardarMock).not.toHaveBeenCalled();
    }
  );

  it('responde 409 si la fase no está activa', async () => {
    buscarMock.mockResolvedValue({
      ...enfrentamiento,
      fase: { ...enfrentamiento.fase, estado: 'finalizada' },
    });

    await expect(cargar({ empate: true })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el enfrentamiento no tiene sus dos equipos', async () => {
    buscarMock.mockResolvedValue({ ...enfrentamiento, equipoBId: null });

    await expect(cargar({ empate: true })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 400 si el ganador no es uno de los dos equipos del partido', async () => {
    await expect(cargar({ ganadorId: 999 })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 409 con un empate en un torneo ganada_perdida', async () => {
    obtenerTorneoMock.mockResolvedValue({
      ...torneoEnCurso,
      sistemaPuntuacion: 'ganada_perdida',
    });

    await expect(cargar({ empate: true })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('en ganada_perdida acepta un ganador', async () => {
    obtenerTorneoMock.mockResolvedValue({
      ...torneoEnCurso,
      sistemaPuntuacion: 'ganada_perdida',
    });

    await expect(cargar({ ganadorId: EQUIPO_A })).resolves.toBeDefined();
  });

  it('en sistema_alternativo acepta un empate', async () => {
    obtenerTorneoMock.mockResolvedValue({
      ...torneoEnCurso,
      sistemaPuntuacion: 'sistema_alternativo',
    });

    await expect(cargar({ empate: true })).resolves.toBeDefined();
  });
});
