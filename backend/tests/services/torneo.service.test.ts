import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as equipoRepository from '@repositories/equipo.repository';
import * as torneoRepository from '@repositories/torneo.repository';
import {
  actualizarTorneo,
  crearTorneo,
  eliminarTorneo,
  iniciarTorneo,
  listarTorneos,
  obtenerTorneo,
  validarConfiguracion,
  type ConfiguracionTorneo,
} from '@services/torneo.service';
import type { ErrorValidacion } from '../../src/middlewares/errors/ErrorValidacion';
import type { EquipoPublico } from '../../src/types/equipo';
import type { FasePublica } from '../../src/types/fase';
import type { TorneoPublico } from '../../src/types/torneo';

// Se reemplazan los repositorios para no necesitar una base de datos.
vi.mock('@repositories/equipo.repository', () => ({
  contarEquiposDeTorneo: vi.fn(),
  limpiarGrupos: vi.fn(),
  listarEquiposDeTorneo: vi.fn(),
}));
vi.mock('@repositories/torneo.repository', () => ({
  crearTorneo: vi.fn(),
  listarTorneosDeCreador: vi.fn(),
  buscarTorneoPorId: vi.fn(),
  actualizarTorneo: vi.fn(),
  eliminarTorneo: vi.fn(),
  iniciarTorneo: vi.fn(),
  iniciarTorneoConBracket: vi.fn(),
}));

const crearMock = vi.mocked(torneoRepository.crearTorneo);
const listarMock = vi.mocked(torneoRepository.listarTorneosDeCreador);
const buscarMock = vi.mocked(torneoRepository.buscarTorneoPorId);
const actualizarMock = vi.mocked(torneoRepository.actualizarTorneo);
const eliminarMock = vi.mocked(torneoRepository.eliminarTorneo);
const iniciarMock = vi.mocked(torneoRepository.iniciarTorneo);
const iniciarBracketMock = vi.mocked(torneoRepository.iniciarTorneoConBracket);
const contarEquiposMock = vi.mocked(equipoRepository.contarEquiposDeTorneo);
const limpiarGruposMock = vi.mocked(equipoRepository.limpiarGrupos);
const listarEquiposMock = vi.mocked(equipoRepository.listarEquiposDeTorneo);

const USUARIO_ID = 7;

/** Fase de prueba: nace pendiente, como las que crea crearTorneo. */
const fasePrueba = (
  orden: number,
  tipo: string,
  extra: Partial<FasePublica> = {}
): FasePublica => ({
  id: 9 + orden,
  torneoId: 1,
  tipo,
  orden,
  estado: 'pendiente',
  lineaDeCorte: null,
  idaYVuelta: false,
  comentarioDesempate: null,
  ...extra,
});

/** Las fases que debe tener un torneo recién creado de cada formato. */
const fasesDe = (
  formato: TorneoPublico['formato'],
  lineaDeCorte: number | null = null
): FasePublica[] => {
  switch (formato) {
    case 'liga_simple':
      return [fasePrueba(1, 'liga')];
    case 'liga_doble':
      return [fasePrueba(1, 'liga', { idaYVuelta: true })];
    case 'eliminacion_simple':
      return [fasePrueba(1, 'eliminacion')];
    case 'eliminacion_doble':
      return [fasePrueba(1, 'eliminacion', { idaYVuelta: true })];
    case 'liguilla_eliminacion':
      return [
        fasePrueba(1, 'liga', { lineaDeCorte }),
        fasePrueba(2, 'eliminacion'),
      ];
    case 'grupos_eliminatorias':
      return [
        fasePrueba(1, 'grupos', { lineaDeCorte }),
        fasePrueba(2, 'eliminacion'),
      ];
  }
};

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
  fases: fasesDe('liga_simple'),
};

const torneoGrupos: TorneoPublico = {
  ...torneoLiga,
  formato: 'grupos_eliminatorias',
  cantidadGrupos: 2,
  fases: fasesDe('grupos_eliminatorias', 1),
};

const torneoLiguilla: TorneoPublico = {
  ...torneoLiga,
  formato: 'liguilla_eliminacion',
  fases: fasesDe('liguilla_eliminacion', 4),
};

/** Un torneo en borrador del formato pedido, con las fases que le tocan. */
const torneoDe = (
  formato: TorneoPublico['formato'],
  extra: Partial<TorneoPublico> = {}
): TorneoPublico => ({
  ...torneoLiga,
  formato,
  // Una línea de corte válida para cualquier cantidad de equipos de las pruebas.
  fases: fasesDe(
    formato,
    formato === 'liguilla_eliminacion'
      ? 2
      : formato === 'grupos_eliminatorias'
        ? 1
        : null
  ),
  ...extra,
});

/**
 * Detalles del ErrorValidacion que lanza la función (vacío si no lanza). Si no
 * se indica la línea de corte, se usa una válida para los formatos que la
 * piden y null para los demás.
 */
const detallesDe = (
  config: Omit<ConfiguracionTorneo, 'lineaDeCorte'> & {
    lineaDeCorte?: number | null;
  }
) => {
  const porDefecto =
    config.formato === 'liguilla_eliminacion'
      ? 2
      : config.formato === 'grupos_eliminatorias'
        ? 1
        : null;
  const completa: ConfiguracionTorneo = {
    ...config,
    lineaDeCorte:
      config.lineaDeCorte === undefined ? porDefecto : config.lineaDeCorte,
  };
  try {
    validarConfiguracion(completa);
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
        lineaDeCorte: 1,
      })
    ).toThrowError(expect.objectContaining({ statusCode: 400 }));
  });

  describe('línea de corte', () => {
    it('exige la línea de corte en liguilla_eliminacion y en grupos_eliminatorias', () => {
      const liguilla = detallesDe({
        formato: 'liguilla_eliminacion',
        cantidadParticipantes: 8,
        cantidadGrupos: null,
        lineaDeCorte: null,
      });
      const grupos = detallesDe({
        formato: 'grupos_eliminatorias',
        cantidadParticipantes: 8,
        cantidadGrupos: 2,
        lineaDeCorte: null,
      });

      expect(liguilla.map((d) => d.campo)).toEqual(['lineaDeCorte']);
      expect(grupos.map((d) => d.campo)).toEqual(['lineaDeCorte']);
    });

    it.each([4, 8, 2])(
      'acepta %s clasificados en una liguilla de 8 participantes',
      (corte) => {
        expect(
          detallesDe({
            formato: 'liguilla_eliminacion',
            cantidadParticipantes: 8,
            cantidadGrupos: null,
            lineaDeCorte: corte,
          })
        ).toEqual([]);
      }
    );

    it.each([1, 9])(
      'rechaza %s clasificados en una liguilla de 8 participantes',
      (corte) => {
        const detalles = detallesDe({
          formato: 'liguilla_eliminacion',
          cantidadParticipantes: 8,
          cantidadGrupos: null,
          lineaDeCorte: corte,
        });

        expect(detalles).toHaveLength(1);
        expect(detalles[0]?.campo).toBe('lineaDeCorte');
      }
    );

    it('en una liguilla acepta una línea de corte que no es potencia de 2 (hay byes)', () => {
      expect(
        detallesDe({
          formato: 'liguilla_eliminacion',
          cantidadParticipantes: 8,
          cantidadGrupos: null,
          lineaDeCorte: 6,
        })
      ).toEqual([]);
    });

    it.each([1, 2])(
      'acepta %s clasificados por grupo con 4 grupos y 8 participantes',
      (corte) => {
        expect(
          detallesDe({
            formato: 'grupos_eliminatorias',
            cantidadParticipantes: 8,
            cantidadGrupos: 4,
            lineaDeCorte: corte,
          })
        ).toEqual([]);
      }
    );

    it.each([3, 6])(
      'rechaza %s clasificados por grupo porque no es potencia de 2',
      (corte) => {
        const detalles = detallesDe({
          formato: 'grupos_eliminatorias',
          cantidadParticipantes: 24,
          cantidadGrupos: 2,
          lineaDeCorte: corte,
        });

        expect(detalles).toHaveLength(1);
        expect(detalles[0]?.campo).toBe('lineaDeCorte');
      }
    );

    it('rechaza más clasificados por grupo que participantes por grupo', () => {
      const detalles = detallesDe({
        formato: 'grupos_eliminatorias',
        cantidadParticipantes: 8,
        cantidadGrupos: 4,
        lineaDeCorte: 4,
      });

      expect(detalles).toHaveLength(1);
      expect(detalles[0]?.campo).toBe('lineaDeCorte');
    });

    it.each(['liguilla_eliminacion', 'grupos_eliminatorias'] as const)(
      'acepta la ida y vuelta de la eliminación en %s',
      (formato) => {
        expect(
          detallesDe({
            formato,
            cantidadParticipantes: 8,
            cantidadGrupos: formato === 'grupos_eliminatorias' ? 2 : null,
            idaYVuelta: true,
          })
        ).toEqual([]);
      }
    );

    it.each([
      'liga_simple',
      'liga_doble',
      'eliminacion_simple',
      'eliminacion_doble',
    ] as const)('rechaza pedir la ida y vuelta en %s', (formato) => {
      const detalles = detallesDe({
        formato,
        cantidadParticipantes: 8,
        cantidadGrupos: null,
        idaYVuelta: true,
      });

      expect(detalles).toHaveLength(1);
      expect(detalles[0]?.campo).toBe('idaYVuelta');
    });

    it('acepta idaYVuelta en false en cualquier formato', () => {
      expect(
        detallesDe({
          formato: 'liga_simple',
          cantidadParticipantes: 8,
          cantidadGrupos: null,
          idaYVuelta: false,
        })
      ).toEqual([]);
    });

    it.each([
      'liga_simple',
      'liga_doble',
      'eliminacion_simple',
      'eliminacion_doble',
    ] as const)('rechaza una línea de corte en %s', (formato) => {
      const detalles = detallesDe({
        formato,
        cantidadParticipantes: 8,
        cantidadGrupos: null,
        lineaDeCorte: 4,
      });

      expect(detalles).toHaveLength(1);
      expect(detalles[0]?.campo).toBe('lineaDeCorte');
    });
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

  it('no guarda nada si falta la línea de corte de un formato mixto', async () => {
    await expect(
      crearTorneo({ ...datos, formato: 'liguilla_eliminacion' })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(crearMock).not.toHaveBeenCalled();
  });

  it.each([
    ['liga_simple', [{ tipo: 'liga', orden: 1, idaYVuelta: false }]],
    ['liga_doble', [{ tipo: 'liga', orden: 1, idaYVuelta: true }]],
    [
      'eliminacion_simple',
      [{ tipo: 'eliminacion', orden: 1, idaYVuelta: false }],
    ],
    [
      'eliminacion_doble',
      [{ tipo: 'eliminacion', orden: 1, idaYVuelta: true }],
    ],
  ] as const)(
    'con formato %s crea el torneo con sus fases',
    async (formato, fases) => {
      await crearTorneo({ ...datos, formato });

      expect(crearMock.mock.calls[0]![1]).toEqual(fases);
    }
  );

  it('con liguilla_eliminacion crea la liga (con la línea de corte) y la eliminatoria', async () => {
    await crearTorneo({
      ...datos,
      formato: 'liguilla_eliminacion',
      lineaDeCorte: 4,
    });

    expect(crearMock.mock.calls[0]![1]).toEqual([
      { tipo: 'liga', orden: 1, idaYVuelta: false, lineaDeCorte: 4 },
      { tipo: 'eliminacion', orden: 2, idaYVuelta: false },
    ]);
  });

  it('con grupos_eliminatorias crea la fase de grupos (con la línea de corte) y la eliminatoria', async () => {
    await crearTorneo({
      ...datos,
      formato: 'grupos_eliminatorias',
      cantidadGrupos: 2,
      lineaDeCorte: 2,
    });

    expect(crearMock.mock.calls[0]![1]).toEqual([
      { tipo: 'grupos', orden: 1, idaYVuelta: false, lineaDeCorte: 2 },
      { tipo: 'eliminacion', orden: 2, idaYVuelta: false },
    ]);
  });

  it('no manda la línea de corte entre los datos del torneo: va dentro de la fase', async () => {
    await crearTorneo({
      ...datos,
      formato: 'liguilla_eliminacion',
      lineaDeCorte: 4,
    });

    expect(crearMock.mock.calls[0]![0]).not.toHaveProperty('lineaDeCorte');
  });

  it('con liguilla_eliminacion e idaYVuelta deja la ida y vuelta en la eliminatoria, no en la liga', async () => {
    await crearTorneo({
      ...datos,
      formato: 'liguilla_eliminacion',
      lineaDeCorte: 4,
      idaYVuelta: true,
    });

    expect(crearMock.mock.calls[0]![1]).toEqual([
      { tipo: 'liga', orden: 1, idaYVuelta: false, lineaDeCorte: 4 },
      { tipo: 'eliminacion', orden: 2, idaYVuelta: true },
    ]);
  });

  it('con grupos_eliminatorias e idaYVuelta deja la ida y vuelta en la eliminatoria', async () => {
    await crearTorneo({
      ...datos,
      formato: 'grupos_eliminatorias',
      cantidadGrupos: 2,
      lineaDeCorte: 2,
      idaYVuelta: true,
    });

    expect(crearMock.mock.calls[0]![1]).toEqual([
      { tipo: 'grupos', orden: 1, idaYVuelta: false, lineaDeCorte: 2 },
      { tipo: 'eliminacion', orden: 2, idaYVuelta: true },
    ]);
  });

  it('idaYVuelta ausente equivale a false', async () => {
    await crearTorneo({
      ...datos,
      formato: 'liguilla_eliminacion',
      lineaDeCorte: 4,
    });

    expect(crearMock.mock.calls[0]![1]![1]).toMatchObject({
      idaYVuelta: false,
    });
  });

  it('no manda idaYVuelta entre los datos del torneo: va dentro de la fase', async () => {
    await crearTorneo({
      ...datos,
      formato: 'liguilla_eliminacion',
      lineaDeCorte: 4,
      idaYVuelta: true,
    });

    expect(crearMock.mock.calls[0]![0]).not.toHaveProperty('idaYVuelta');
  });

  it('no guarda nada si se pide ida y vuelta en un formato que no la admite', async () => {
    await expect(
      crearTorneo({ ...datos, idaYVuelta: true })
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

    expect(actualizarMock).toHaveBeenCalledWith(
      1,
      { nombre: 'Nuevo nombre', cantidadGrupos: null },
      undefined
    );
  });

  it('limpia los grupos al pasar a un formato que no los usa', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    await actualizarTorneo(1, USUARIO_ID, { formato: 'liga_simple' });

    expect(actualizarMock).toHaveBeenCalledWith(
      1,
      { formato: 'liga_simple', cantidadGrupos: null },
      [{ tipo: 'liga', orden: 1, idaYVuelta: false }]
    );
  });

  it('conserva los grupos guardados si el formato sigue siendo grupos_eliminatorias', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    await actualizarTorneo(1, USUARIO_ID, { nombre: 'Copa' });

    expect(actualizarMock).toHaveBeenCalledWith(
      1,
      { nombre: 'Copa', cantidadGrupos: 2 },
      undefined
    );
  });

  describe('fases del borrador', () => {
    it('no regenera las fases si no cambia el formato ni la línea de corte', async () => {
      buscarMock.mockResolvedValue(torneoLiguilla);

      await actualizarTorneo(1, USUARIO_ID, {
        nombre: 'Otro nombre',
        lineaDeCorte: 4,
      });

      expect(actualizarMock.mock.calls[0]![2]).toBeUndefined();
    });

    it('regenera las fases al cambiar el formato', async () => {
      buscarMock.mockResolvedValue(torneoLiga);

      await actualizarTorneo(1, USUARIO_ID, { formato: 'liga_doble' });

      expect(actualizarMock.mock.calls[0]![2]).toEqual([
        { tipo: 'liga', orden: 1, idaYVuelta: true },
      ]);
    });

    it('regenera las fases al cambiar la línea de corte y la deja en la fase 1', async () => {
      buscarMock.mockResolvedValue(torneoLiguilla);

      await actualizarTorneo(1, USUARIO_ID, { lineaDeCorte: 6 });

      expect(actualizarMock.mock.calls[0]![2]).toEqual([
        { tipo: 'liga', orden: 1, idaYVuelta: false, lineaDeCorte: 6 },
        { tipo: 'eliminacion', orden: 2, idaYVuelta: false },
      ]);
    });

    it('no manda la línea de corte entre los datos del torneo', async () => {
      buscarMock.mockResolvedValue(torneoLiguilla);

      await actualizarTorneo(1, USUARIO_ID, { lineaDeCorte: 6 });

      expect(actualizarMock.mock.calls[0]![1]).not.toHaveProperty(
        'lineaDeCorte'
      );
    });

    it('regenera las fases de un torneo en borrador que todavía no tiene ninguna', async () => {
      buscarMock.mockResolvedValue({ ...torneoLiga, fases: [] });

      await actualizarTorneo(1, USUARIO_ID, { nombre: 'Liga' });

      expect(actualizarMock.mock.calls[0]![2]).toEqual([
        { tipo: 'liga', orden: 1, idaYVuelta: false },
      ]);
    });

    it('al cambiar a otro formato mixto no reutiliza la línea de corte guardada', async () => {
      buscarMock.mockResolvedValue(torneoLiguilla);

      await expect(
        actualizarTorneo(1, USUARIO_ID, {
          formato: 'grupos_eliminatorias',
          cantidadGrupos: 2,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(actualizarMock).not.toHaveBeenCalled();
    });

    it('al pasar a un formato mixto exige indicar la línea de corte', async () => {
      buscarMock.mockResolvedValue(torneoLiga);

      await expect(
        actualizarTorneo(1, USUARIO_ID, { formato: 'liguilla_eliminacion' })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(actualizarMock).not.toHaveBeenCalled();
    });

    it('valida la línea de corte guardada contra la nueva cantidad de participantes', async () => {
      buscarMock.mockResolvedValue(torneoLiguilla);

      await expect(
        actualizarTorneo(1, USUARIO_ID, { cantidadParticipantes: 3 })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(actualizarMock).not.toHaveBeenCalled();
    });

    it('regenera las fases al activar la ida y vuelta de la eliminatoria', async () => {
      buscarMock.mockResolvedValue(torneoLiguilla);

      await actualizarTorneo(1, USUARIO_ID, { idaYVuelta: true });

      expect(actualizarMock.mock.calls[0]![2]).toEqual([
        { tipo: 'liga', orden: 1, idaYVuelta: false, lineaDeCorte: 4 },
        { tipo: 'eliminacion', orden: 2, idaYVuelta: true },
      ]);
      expect(actualizarMock.mock.calls[0]![1]).not.toHaveProperty('idaYVuelta');
    });

    it('conserva la ida y vuelta guardada si no se indica', async () => {
      buscarMock.mockResolvedValue({
        ...torneoLiguilla,
        fases: [
          fasePrueba(1, 'liga', { lineaDeCorte: 4 }),
          fasePrueba(2, 'eliminacion', { idaYVuelta: true }),
        ],
      });

      await actualizarTorneo(1, USUARIO_ID, { nombre: 'Otro nombre' });

      expect(actualizarMock.mock.calls[0]![2]).toBeUndefined();
    });

    it('regenera las fases al apagar la ida y vuelta', async () => {
      buscarMock.mockResolvedValue({
        ...torneoLiguilla,
        fases: [
          fasePrueba(1, 'liga', { lineaDeCorte: 4 }),
          fasePrueba(2, 'eliminacion', { idaYVuelta: true }),
        ],
      });

      await actualizarTorneo(1, USUARIO_ID, { idaYVuelta: false });

      expect(actualizarMock.mock.calls[0]![2]).toEqual([
        { tipo: 'liga', orden: 1, idaYVuelta: false, lineaDeCorte: 4 },
        { tipo: 'eliminacion', orden: 2, idaYVuelta: false },
      ]);
    });

    it('al cambiar de formato la ida y vuelta guardada no se arrastra', async () => {
      buscarMock.mockResolvedValue({
        ...torneoLiguilla,
        fases: [
          fasePrueba(1, 'liga', { lineaDeCorte: 4 }),
          fasePrueba(2, 'eliminacion', { idaYVuelta: true }),
        ],
      });

      await actualizarTorneo(1, USUARIO_ID, {
        formato: 'grupos_eliminatorias',
        cantidadGrupos: 2,
        lineaDeCorte: 1,
      });

      expect(actualizarMock.mock.calls[0]![2]).toEqual([
        { tipo: 'grupos', orden: 1, idaYVuelta: false, lineaDeCorte: 1 },
        { tipo: 'eliminacion', orden: 2, idaYVuelta: false },
      ]);
    });

    it('rechaza pedir la ida y vuelta en un formato que no la admite', async () => {
      buscarMock.mockResolvedValue(torneoLiga);

      await expect(
        actualizarTorneo(1, USUARIO_ID, { idaYVuelta: true })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(actualizarMock).not.toHaveBeenCalled();
    });

    it('rechaza una línea de corte en un formato que no la usa', async () => {
      buscarMock.mockResolvedValue(torneoLiga);

      await expect(
        actualizarTorneo(1, USUARIO_ID, { lineaDeCorte: 2 })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(actualizarMock).not.toHaveBeenCalled();
    });
  });

  it('descarta los grupos asignados al cambiar la cantidad de grupos', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    await actualizarTorneo(1, USUARIO_ID, { cantidadGrupos: 4 });

    expect(limpiarGruposMock).toHaveBeenCalledWith(1);
  });

  it('descarta los grupos asignados al pasar a un formato sin grupos', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    await actualizarTorneo(1, USUARIO_ID, { formato: 'liga_simple' });

    expect(limpiarGruposMock).toHaveBeenCalledWith(1);
  });

  it('no toca los grupos si la cantidad de grupos no cambia', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);

    await actualizarTorneo(1, USUARIO_ID, { nombre: 'Copa' });

    expect(limpiarGruposMock).not.toHaveBeenCalled();
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

/** Equipos de prueba, todos con el mismo grupo (null si el torneo no usa grupos). */
const equiposDe = (
  cantidad: number,
  grupo: number | null = null
): EquipoPublico[] =>
  Array.from({ length: cantidad }, (_, i) => ({
    id: i + 1,
    torneoId: 1,
    nombre: `Equipo ${i + 1}`,
    grupo,
    integrantes: [],
  }));

describe('iniciarTorneo', () => {
  beforeEach(() => {
    buscarMock.mockResolvedValue(torneoLiga);
    listarEquiposMock.mockResolvedValue(equiposDe(8));
    // El repositorio activa la fase que le indican (ya existe, pendiente).
    const iniciada = (
      id: number,
      cantidadParticipantes: number,
      faseId: number
    ) => ({
      torneo: {
        ...torneoLiga,
        id,
        estado: 'en_curso' as const,
        cantidadParticipantes,
      },
      fase: { ...fasePrueba(1, 'liga'), id: faseId, estado: 'activa' },
    });
    iniciarMock.mockImplementation(async (id, cantidad, faseId) =>
      iniciada(id, cantidad, faseId)
    );
    iniciarBracketMock.mockImplementation(async (id, cantidad, faseId) =>
      iniciada(id, cantidad, faseId)
    );
  });

  it('inicia un torneo en borrador y devuelve el torneo en curso con su primera fase activa', async () => {
    const resultado = await iniciarTorneo(1, USUARIO_ID);

    expect(resultado.torneo.estado).toBe('en_curso');
    expect(resultado.fase).toMatchObject({ id: 10, estado: 'activa' });
  });

  it.each([
    ['liga_simple', 'liga'],
    ['liga_doble', 'liga'],
    ['eliminacion_simple', 'eliminacion'],
    ['eliminacion_doble', 'eliminacion'],
    ['liguilla_eliminacion', 'liga'],
    ['grupos_eliminatorias', 'grupos'],
  ] as const)(
    'con formato %s activa la primera fase, que es de tipo %s, sin crear otra',
    async (formato, tipo) => {
      const usaGrupos = formato === 'grupos_eliminatorias';
      buscarMock.mockResolvedValue(
        torneoDe(formato, { cantidadGrupos: usaGrupos ? 2 : null })
      );
      listarEquiposMock.mockResolvedValue(equiposDe(8, usaGrupos ? 1 : null));

      await iniciarTorneo(1, USUARIO_ID);

      // La eliminación (simple o doble) guarda el cuadro con su propia función.
      const llamado = tipo === 'eliminacion' ? iniciarBracketMock : iniciarMock;

      expect(llamado).toHaveBeenCalledWith(1, 8, 10, expect.any(Array));
    }
  );

  it('en un formato con dos fases solo activa la primera: la segunda queda pendiente', async () => {
    buscarMock.mockResolvedValue(torneoLiguilla);

    await iniciarTorneo(1, USUARIO_ID);

    expect(iniciarMock).toHaveBeenCalledTimes(1);
    expect(iniciarMock.mock.calls[0]![2]).toBe(10);
  });

  it('responde 409 y no inicia nada si el torneo no tiene fases', async () => {
    buscarMock.mockResolvedValue({ ...torneoLiga, fases: [] });

    await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(iniciarMock).not.toHaveBeenCalled();
    expect(iniciarBracketMock).not.toHaveBeenCalled();
  });

  it('responde 400 si la línea de corte guardada ya no entra con los equipos inscriptos', async () => {
    buscarMock.mockResolvedValue({
      ...torneoLiguilla,
      fases: fasesDe('liguilla_eliminacion', 6),
    });
    listarEquiposMock.mockResolvedValue(equiposDe(4));

    await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(iniciarMock).not.toHaveBeenCalled();
  });

  it('fija la cantidad de participantes en la de equipos realmente inscriptos', async () => {
    listarEquiposMock.mockResolvedValue(equiposDe(5));

    const resultado = await iniciarTorneo(1, USUARIO_ID);

    expect(iniciarMock).toHaveBeenCalledWith(
      1,
      5,
      expect.anything(),
      expect.any(Array)
    );
    expect(resultado.torneo.cantidadParticipantes).toBe(5);
  });

  it('responde 404 y no inicia nada si el torneo no existe', async () => {
    buscarMock.mockResolvedValue(null);

    await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(iniciarMock).not.toHaveBeenCalled();
  });

  it('responde 404 y no inicia nada si el torneo es de otro organizador', async () => {
    buscarMock.mockResolvedValue({ ...torneoLiga, creadorId: 99 });

    await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(iniciarMock).not.toHaveBeenCalled();
  });

  it.each(['en_curso', 'finalizado', 'cancelado'] as const)(
    'responde 409 y no inicia nada si el torneo está %s',
    async (estado) => {
      buscarMock.mockResolvedValue({ ...torneoLiga, estado });

      await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(iniciarMock).not.toHaveBeenCalled();
    }
  );

  it.each([0, 1])(
    'responde 409 y no inicia nada con %i equipos inscriptos',
    async (cantidad) => {
      listarEquiposMock.mockResolvedValue(equiposDe(cantidad));

      await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(iniciarMock).not.toHaveBeenCalled();
    }
  );

  it('inicia con 2 equipos, el mínimo', async () => {
    listarEquiposMock.mockResolvedValue(equiposDe(2));

    await iniciarTorneo(1, USUARIO_ID);

    expect(iniciarMock).toHaveBeenCalledWith(
      1,
      2,
      expect.anything(),
      expect.any(Array)
    );
  });

  it('en grupos_eliminatorias responde 409 si algún equipo no tiene grupo', async () => {
    buscarMock.mockResolvedValue(torneoGrupos);
    listarEquiposMock.mockResolvedValue([
      ...equiposDe(7, 1),
      { id: 8, torneoId: 1, nombre: 'Equipo 8', grupo: null, integrantes: [] },
    ]);

    await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(iniciarMock).not.toHaveBeenCalled();
  });

  it('en grupos_eliminatorias responde 400 si los equipos inscriptos no alcanzan para los grupos', async () => {
    buscarMock.mockResolvedValue({ ...torneoGrupos, cantidadGrupos: 4 });
    listarEquiposMock.mockResolvedValue(equiposDe(5, 1));

    await expect(iniciarTorneo(1, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(iniciarMock).not.toHaveBeenCalled();
  });

  it('en otros formatos no exige grupos', async () => {
    listarEquiposMock.mockResolvedValue(equiposDe(4, null));

    await expect(iniciarTorneo(1, USUARIO_ID)).resolves.toBeDefined();
  });

  describe('generación de enfrentamientos de liga', () => {
    /** Enfrentamientos con los que el service llamó al repositorio. */
    const enfrentamientosGenerados = () => iniciarMock.mock.calls[0]?.[3] ?? [];

    /** Instancias distintas, en orden de aparición. */
    const instanciasDe = (enfrentamientos: { instancia: string }[]) => [
      ...new Set(enfrentamientos.map((e) => e.instancia)),
    ];

    const iniciarConFormato = async (
      formato: TorneoPublico['formato'],
      cantidadEquipos: number
    ) => {
      buscarMock.mockResolvedValue(torneoDe(formato));
      listarEquiposMock.mockResolvedValue(equiposDe(cantidadEquipos));

      await iniciarTorneo(1, USUARIO_ID);

      return enfrentamientosGenerados();
    };

    it('en liga_simple genera todos contra todos, con una fecha por ronda', async () => {
      const enfrentamientos = await iniciarConFormato('liga_simple', 4);

      expect(enfrentamientos).toHaveLength(6);
      expect(instanciasDe(enfrentamientos)).toEqual([
        'fecha_1',
        'fecha_2',
        'fecha_3',
      ]);
      expect(
        enfrentamientos.filter((e) => e.instancia === 'fecha_1')
      ).toHaveLength(2);
    });

    it('en liga_simple cada par de equipos se enfrenta una sola vez', async () => {
      const enfrentamientos = await iniciarConFormato('liga_simple', 6);

      const pares = enfrentamientos.map((e) =>
        [e.equipoAId, e.equipoBId].sort((a, b) => a - b).join('-')
      );

      expect(enfrentamientos).toHaveLength(15);
      expect(new Set(pares).size).toBe(15);
    });

    it('en una misma fecha ningún equipo juega dos veces', async () => {
      const enfrentamientos = await iniciarConFormato('liga_simple', 8);

      instanciasDe(enfrentamientos).forEach((instancia) => {
        const ids = enfrentamientos
          .filter((e) => e.instancia === instancia)
          .flatMap((e) => [e.equipoAId, e.equipoBId]);

        expect(new Set(ids).size).toBe(ids.length);
      });
    });

    it('con cantidad impar de equipos hay una fecha más y uno descansa por fecha', async () => {
      const enfrentamientos = await iniciarConFormato('liga_simple', 5);

      expect(enfrentamientos).toHaveLength(10);
      expect(instanciasDe(enfrentamientos)).toHaveLength(5);
      instanciasDe(enfrentamientos).forEach((instancia) => {
        expect(
          enfrentamientos.filter((e) => e.instancia === instancia)
        ).toHaveLength(2);
      });
    });

    it('en liga_doble numera la vuelta a continuación de la ida, con local y visitante invertidos', async () => {
      const enfrentamientos = await iniciarConFormato('liga_doble', 4);

      expect(enfrentamientos).toHaveLength(12);
      expect(instanciasDe(enfrentamientos)).toEqual([
        'fecha_1',
        'fecha_2',
        'fecha_3',
        'fecha_4',
        'fecha_5',
        'fecha_6',
      ]);

      const ida = enfrentamientos.filter((e) =>
        ['fecha_1', 'fecha_2', 'fecha_3'].includes(e.instancia)
      );
      const vuelta = enfrentamientos.filter((e) =>
        ['fecha_4', 'fecha_5', 'fecha_6'].includes(e.instancia)
      );

      ida.forEach((partido) => {
        expect(vuelta).toContainEqual(
          expect.objectContaining({
            equipoAId: partido.equipoBId,
            equipoBId: partido.equipoAId,
          })
        );
      });
    });

    it('en liguilla_eliminacion genera solo la liga de ida', async () => {
      const enfrentamientos = await iniciarConFormato(
        'liguilla_eliminacion',
        4
      );

      expect(enfrentamientos).toHaveLength(6);
      expect(instanciasDe(enfrentamientos)).toHaveLength(3);
    });

    it('en grupos_eliminatorias no genera enfrentamientos todavía', async () => {
      buscarMock.mockResolvedValue(torneoGrupos);
      listarEquiposMock.mockResolvedValue(equiposDe(8, 1));

      await iniciarTorneo(1, USUARIO_ID);

      expect(enfrentamientosGenerados()).toEqual([]);
    });
  });

  describe('generación del cuadro de eliminación simple', () => {
    /** Partidos con los que el service llamó al repositorio. */
    const partidosGenerados = () => iniciarBracketMock.mock.calls[0]?.[3] ?? [];

    const iniciarEliminacion = async (cantidadEquipos: number) => {
      buscarMock.mockResolvedValue(torneoDe('eliminacion_simple'));
      listarEquiposMock.mockResolvedValue(equiposDe(cantidadEquipos));

      await iniciarTorneo(1, USUARIO_ID);

      return partidosGenerados();
    };

    it('con 8 equipos crea las 3 rondas (7 partidos) y no usa la creación de ligas', async () => {
      const partidos = await iniciarEliminacion(8);

      expect(partidos).toHaveLength(7);
      expect(partidos.map((p) => p.instancia)).toEqual([
        ...Array(4).fill('cuartos'),
        ...Array(2).fill('semifinal'),
        'final',
      ]);
      expect(iniciarMock).not.toHaveBeenCalled();
    });

    it('ubica a los 8 equipos una sola vez en la primera ronda y deja vacías las siguientes', async () => {
      const partidos = await iniciarEliminacion(8);

      const primeraRonda = partidos.filter((p) => p.ronda === 1);
      const ids = primeraRonda.flatMap((p) => [p.equipoAId, p.equipoBId]);

      expect(new Set(ids).size).toBe(8);
      partidos
        .filter((p) => p.ronda > 1)
        .forEach((p) => {
          expect(p.equipoAId).toBeNull();
          expect(p.equipoBId).toBeNull();
          expect(p.ganadorId).toBeNull();
        });
    });

    it('con 6 equipos hay 2 byes: ganador automático y equipo ya promovido a la ronda siguiente', async () => {
      const partidos = await iniciarEliminacion(6);

      const byes = partidos.filter(
        (p) => p.ronda === 1 && p.equipoBId === null
      );
      expect(byes).toHaveLength(2);

      byes.forEach((bye) => {
        expect(bye.ganadorId).toBe(bye.equipoAId);
        const siguiente = partidos[bye.siguienteIndice ?? -1];
        expect([siguiente?.equipoAId, siguiente?.equipoBId]).toContain(
          bye.ganadorId
        );
      });
    });

    it('en cada ronda siguiente, los partidos encadenados apuntan al partido que sigue', async () => {
      const partidos = await iniciarEliminacion(4);

      const final = partidos.find((p) => p.instancia === 'final');
      expect(final?.siguienteIndice).toBeNull();
      partidos
        .filter((p) => p.instancia === 'semifinal')
        .forEach((p) => expect(p.siguienteIndice).toBe(final?.indice));
    });
  });

  describe('generación del cuadro de eliminación doble (ida y vuelta)', () => {
    const partidosGenerados = () => iniciarBracketMock.mock.calls[0]?.[3] ?? [];

    const iniciarEliminacionDoble = async (cantidadEquipos: number) => {
      buscarMock.mockResolvedValue(torneoDe('eliminacion_doble'));
      listarEquiposMock.mockResolvedValue(equiposDe(cantidadEquipos));

      await iniciarTorneo(1, USUARIO_ID);

      return partidosGenerados();
    };

    it('con 4 equipos crea dos filas por cruce, final incluida (6 partidos)', async () => {
      const partidos = await iniciarEliminacionDoble(4);

      expect(partidos.map((p) => p.instancia)).toEqual([
        'semifinal_ida',
        'semifinal_vuelta',
        'semifinal_ida',
        'semifinal_vuelta',
        'final_ida',
        'final_vuelta',
      ]);
      expect(iniciarMock).not.toHaveBeenCalled();
    });

    it('cada vuelta apunta a su ida y tiene los equipos invertidos', async () => {
      const partidos = await iniciarEliminacionDoble(4);

      const vueltas = partidos.filter((p) => p.instancia.endsWith('_vuelta'));
      expect(vueltas).toHaveLength(3);

      vueltas.forEach((vuelta) => {
        const ida = partidos[vuelta.vueltaDeIndice ?? -1];
        expect(ida?.instancia.replace('_ida', '')).toBe(
          vuelta.instancia.replace('_vuelta', '')
        );
        expect(ida?.indice).toBeLessThan(vuelta.indice);
        expect(vuelta.equipoAId).toBe(ida?.equipoBId);
        expect(vuelta.equipoBId).toBe(ida?.equipoAId);
      });
    });

    it('solo la vuelta apunta al cruce siguiente, y lo hace a su ida', async () => {
      const partidos = await iniciarEliminacionDoble(4);

      partidos
        .filter((p) => p.instancia.endsWith('_ida'))
        .forEach((ida) => expect(ida.siguienteIndice).toBeNull());

      const finalIda = partidos.find((p) => p.instancia === 'final_ida');
      partidos
        .filter((p) => p.instancia === 'semifinal_vuelta')
        .forEach((vuelta) =>
          expect(vuelta.siguienteIndice).toBe(finalIda?.indice)
        );
      const finalVuelta = partidos.find((p) => p.instancia === 'final_vuelta');
      expect(finalVuelta?.siguienteIndice).toBeNull();
    });

    it('con 7 equipos el bye es una sola fila, con ganador automático y sin vuelta', async () => {
      const partidos = await iniciarEliminacionDoble(7);

      // 3 cruces de cuartos con dos filas + 1 bye + 2 semifinales + final
      expect(partidos).toHaveLength(13);
      const byes = partidos.filter((p) => p.instancia === 'cuartos');
      expect(byes).toHaveLength(1);
      expect(byes[0]?.equipoBId).toBeNull();
      expect(byes[0]?.ganadorId).toBe(byes[0]?.equipoAId);
      expect(byes[0]?.vueltaDeIndice).toBeNull();
    });

    it('el equipo con bye queda en la ida y, invertido, en la vuelta del cruce siguiente', async () => {
      const partidos = await iniciarEliminacionDoble(7);

      const bye = partidos.find((p) => p.instancia === 'cuartos');
      const ida = partidos[bye?.siguienteIndice ?? -1];
      const vuelta = partidos.find((p) => p.vueltaDeIndice === ida?.indice);

      expect(ida?.instancia).toBe('semifinal_ida');
      expect([ida?.equipoAId, ida?.equipoBId]).toContain(bye?.ganadorId);
      expect(vuelta?.equipoAId).toBe(ida?.equipoBId);
      expect(vuelta?.equipoBId).toBe(ida?.equipoAId);
    });
  });
});
