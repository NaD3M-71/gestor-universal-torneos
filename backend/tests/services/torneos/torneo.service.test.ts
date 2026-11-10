import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as torneoRepository from '@repositories/torneo.repository';
import {
  actualizarTorneo,
  crearTorneo,
  eliminarTorneo,
  listarTorneos,
  obtenerTorneo,
  validarConfiguracion,
  type ConfiguracionTorneo,
} from '@services/torneos/torneo.service';
import type { ErrorValidacion } from '../../../src/middlewares/errors/ErrorValidacion';
import type { TorneoPublico } from '../../../src/types/torneo';

// Se reemplaza el repositorio para no necesitar una base de datos.
vi.mock('@repositories/torneo.repository', () => ({
  crearTorneo: vi.fn(),
  listarTorneosDeCreador: vi.fn(),
  buscarTorneoPorId: vi.fn(),
  actualizarTorneo: vi.fn(),
  eliminarTorneo: vi.fn(),
  contarEquiposDeTorneo: vi.fn(),
}));

const crearMock = vi.mocked(torneoRepository.crearTorneo);
const listarMock = vi.mocked(torneoRepository.listarTorneosDeCreador);
const buscarMock = vi.mocked(torneoRepository.buscarTorneoPorId);
const actualizarMock = vi.mocked(torneoRepository.actualizarTorneo);
const eliminarMock = vi.mocked(torneoRepository.eliminarTorneo);
const contarEquiposMock = vi.mocked(torneoRepository.contarEquiposDeTorneo);

const USUARIO_ID = 7;

const torneoLiga: TorneoPublico = {
  id: 1,
  creadorId: USUARIO_ID,
  nombre: 'Liga nocturna',
  descripcion: null,
  formato: 'liga_simple',
  sistemaPuntuacion: 'futbol_clasico',
  cantidadParticipantes: 8,
  cantidadGrupos: null,
  fechaInicio: null,
  estado: 'borrador',
  campeonId: null,
};

const torneoGrupos: TorneoPublico = {
  ...torneoLiga,
  formato: 'grupos_eliminatorias',
  cantidadGrupos: 2,
};

/** Detalles del ErrorValidacion que lanza la función (vacío si no lanza). */
const detallesDe = (config: ConfiguracionTorneo) => {
  try {
    validarConfiguracion(config);
  } catch (error) {
    return (error as ErrorValidacion).detalles;
  }
  return [];
};

beforeEach(() => {
  vi.resetAllMocks();
  crearMock.mockImplementation(async (datos) => ({
    ...torneoLiga,
    ...datos,
    id: 99,
    estado: 'borrador',
    campeonId: null,
    descripcion: datos.descripcion ?? null,
    cantidadGrupos: datos.cantidadGrupos ?? null,
    fechaInicio: datos.fechaInicio ?? null,
  }));
  actualizarMock.mockImplementation(async (id, datos) => ({
    ...torneoLiga,
    ...datos,
    id,
  }));
  contarEquiposMock.mockResolvedValue(0);
});

describe('validarConfiguracion', () => {
  it.each([
    'liga_simple',
    'liga_doble',
    'eliminacion_simple',
    'eliminacion_doble',
    'liguilla_eliminacion',
  ] as const)('acepta %s sin grupos', (formato) => {
    expect(
      detallesDe({ formato, cantidadParticipantes: 8, cantidadGrupos: null })
    ).toEqual([]);
  });

  it('acepta una eliminación con participantes que no son potencia de 2 (hay byes)', () => {
    expect(
      detallesDe({
        formato: 'eliminacion_simple',
        cantidadParticipantes: 7,
        cantidadGrupos: null,
      })
    ).toEqual([]);
  });

  it('acepta grupos_eliminatorias con grupos potencia de 2 y 2 participantes por grupo', () => {
    expect(
      detallesDe({
        formato: 'grupos_eliminatorias',
        cantidadParticipantes: 8,
        cantidadGrupos: 4,
      })
    ).toEqual([]);
  });

  it('exige la cantidad de grupos en grupos_eliminatorias', () => {
    const detalles = detallesDe({
      formato: 'grupos_eliminatorias',
      cantidadParticipantes: 8,
      cantidadGrupos: null,
    });

    expect(detalles).toHaveLength(1);
    expect(detalles[0]?.campo).toBe('cantidadGrupos');
  });

  it.each([3, 5, 6, 12])(
    'rechaza %s grupos porque no es potencia de 2',
    (grupos) => {
      const detalles = detallesDe({
        formato: 'grupos_eliminatorias',
        cantidadParticipantes: 64,
        cantidadGrupos: grupos,
      });

      expect(detalles).toHaveLength(1);
      expect(detalles[0]?.campo).toBe('cantidadGrupos');
    }
  );

  it('rechaza grupos con menos de 2 participantes por grupo', () => {
    const detalles = detallesDe({
      formato: 'grupos_eliminatorias',
      cantidadParticipantes: 6,
      cantidadGrupos: 4,
    });

    expect(detalles).toHaveLength(1);
    expect(detalles[0]?.campo).toBe('cantidadParticipantes');
  });

  it('rechaza grupos en un formato que no los usa', () => {
    const detalles = detallesDe({
      formato: 'liga_simple',
      cantidadParticipantes: 8,
      cantidadGrupos: 2,
    });

    expect(detalles).toHaveLength(1);
    expect(detalles[0]?.campo).toBe('cantidadGrupos');
  });

  it('lanza un error 400', () => {
    expect(() =>
      validarConfiguracion({
        formato: 'grupos_eliminatorias',
        cantidadParticipantes: 8,
        cantidadGrupos: null,
      })
    ).toThrowError(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('crearTorneo', () => {
  const datos = {
    creadorId: USUARIO_ID,
    nombre: 'Liga nocturna',
    formato: 'liga_simple' as const,
    sistemaPuntuacion: 'futbol_clasico' as const,
    cantidadParticipantes: 8,
  };

  it('guarda una descripción vacía como null y la cantidad de grupos ausente como null', async () => {
    await crearTorneo({ ...datos, descripcion: '   ' });

    const guardado = crearMock.mock.calls[0]![0];
    expect(guardado.descripcion).toBeNull();
    expect(guardado.cantidadGrupos).toBeNull();
  });

  it('guarda la descripción sin espacios sobrantes', async () => {
    await crearTorneo({ ...datos, descripcion: '  Fútbol 5  ' });

    expect(crearMock.mock.calls[0]![0].descripcion).toBe('Fútbol 5');
  });

  it('devuelve el torneo que entrega el repositorio', async () => {
    const torneo = await crearTorneo(datos);

    expect(torneo.id).toBe(99);
    expect(torneo.estado).toBe('borrador');
  });

  it('no guarda nada si la configuración no es válida', async () => {
    await expect(
      crearTorneo({ ...datos, formato: 'grupos_eliminatorias' })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(crearMock).not.toHaveBeenCalled();
  });
});

describe('listarTorneos', () => {
  it('pide al repositorio los torneos del organizador', async () => {
    listarMock.mockResolvedValue([torneoLiga]);

    const torneos = await listarTorneos(USUARIO_ID);

    expect(listarMock).toHaveBeenCalledWith(USUARIO_ID);
    expect(torneos).toEqual([torneoLiga]);
  });
});

describe('obtenerTorneo', () => {
  it('devuelve el torneo si es del organizador', async () => {
    buscarMock.mockResolvedValue(torneoLiga);

    await expect(obtenerTorneo(1, USUARIO_ID)).resolves.toEqual(torneoLiga);
  });

  it('responde 404 si el torneo no existe', async () => {
    buscarMock.mockResolvedValue(null);

    await expect(obtenerTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('responde 404 si el torneo es de otro organizador', async () => {
    buscarMock.mockResolvedValue({ ...torneoLiga, creadorId: 99 });

    await expect(obtenerTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('actualizarTorneo', () => {
  it('responde 404 y no modifica nada si el torneo es de otro organizador', async () => {
    buscarMock.mockResolvedValue({ ...torneoLiga, creadorId: 99 });

    await expect(
      actualizarTorneo(1, USUARIO_ID, { nombre: 'Otro' })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it.each(['en_curso', 'finalizado'] as const)(
    'responde 409 y no modifica nada si el torneo está %s',
    async (estado) => {
      buscarMock.mockResolvedValue({ ...torneoLiga, estado });

      await expect(
        actualizarTorneo(1, USUARIO_ID, { formato: 'liga_doble' })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(actualizarMock).not.toHaveBeenCalled();
    }
  );

  it('envía solo lo recibido y deja los grupos en null si el formato no los usa', async () => {
    buscarMock.mockResolvedValue(torneoLiga);

    await actualizarTorneo(1, USUARIO_ID, { nombre: 'Nuevo nombre' });

    expect(actualizarMock).toHaveBeenCalledWith(1, {
      nombre: 'Nuevo nombre',
      cantidadGrupos: null,
    });
  });

  it('limpia los grupos al pasar a un formato que no los usa', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    await actualizarTorneo(1, USUARIO_ID, { formato: 'liga_simple' });

    expect(actualizarMock).toHaveBeenCalledWith(1, {
      formato: 'liga_simple',
      cantidadGrupos: null,
    });
  });

  it('conserva los grupos guardados si el formato sigue siendo grupos_eliminatorias', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    await actualizarTorneo(1, USUARIO_ID, { nombre: 'Copa' });

    expect(actualizarMock).toHaveBeenCalledWith(1, {
      nombre: 'Copa',
      cantidadGrupos: 2,
    });
  });

  it('valida la configuración combinada con lo ya guardado', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    // 3 participantes no alcanzan para los 2 grupos que ya tiene guardados.
    await expect(
      actualizarTorneo(1, USUARIO_ID, { cantidadParticipantes: 3 })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it('rechaza pasar a grupos_eliminatorias sin indicar los grupos', async () => {
    buscarMock.mockResolvedValue(torneoLiga);

    await expect(
      actualizarTorneo(1, USUARIO_ID, { formato: 'grupos_eliminatorias' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it('responde 409 si ya hay más equipos inscriptos que la nueva cantidad de participantes', async () => {
    buscarMock.mockResolvedValue(torneoLiga);
    contarEquiposMock.mockResolvedValue(6);

    await expect(
      actualizarTorneo(1, USUARIO_ID, { cantidadParticipantes: 4 })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it('acepta una cantidad de participantes igual a los equipos ya inscriptos', async () => {
    buscarMock.mockResolvedValue(torneoLiga);
    contarEquiposMock.mockResolvedValue(4);

    await actualizarTorneo(1, USUARIO_ID, { cantidadParticipantes: 4 });

    expect(actualizarMock).toHaveBeenCalledTimes(1);
  });

  it('no cuenta equipos si no cambia la cantidad de participantes', async () => {
    buscarMock.mockResolvedValue(torneoLiga);

    await actualizarTorneo(1, USUARIO_ID, { nombre: 'Otro nombre' });

    expect(contarEquiposMock).not.toHaveBeenCalled();
  });

  it('guarda una descripción vacía como null', async () => {
    buscarMock.mockResolvedValue(torneoLiga);

    await actualizarTorneo(1, USUARIO_ID, { descripcion: '  ' });

    expect(actualizarMock.mock.calls[0]![1].descripcion).toBeNull();
  });
});

describe('eliminarTorneo', () => {
  it('borra un torneo propio en borrador', async () => {
    buscarMock.mockResolvedValue(torneoLiga);

    await eliminarTorneo(1, USUARIO_ID);

    expect(eliminarMock).toHaveBeenCalledWith(1);
  });

  it('responde 404 y no borra si el torneo es de otro organizador', async () => {
    buscarMock.mockResolvedValue({ ...torneoLiga, creadorId: 99 });

    await expect(eliminarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(eliminarMock).not.toHaveBeenCalled();
  });

  it('responde 409 y no borra si el torneo ya no está en borrador', async () => {
    buscarMock.mockResolvedValue({ ...torneoLiga, estado: 'en_curso' });

    await expect(eliminarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(eliminarMock).not.toHaveBeenCalled();
  });
});
