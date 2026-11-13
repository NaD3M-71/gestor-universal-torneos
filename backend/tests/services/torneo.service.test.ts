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
import type { DatosNuevaFase } from '../../src/types/fase';
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
    const iniciada = (
      id: number,
      cantidadParticipantes: number,
      fase: DatosNuevaFase
    ) => ({
      torneo: {
        ...torneoLiga,
        id,
        estado: 'en_curso' as const,
        cantidadParticipantes,
      },
      fase: {
        id: 10,
        torneoId: id,
        estado: 'activa',
        lineaDeCorte: null,
        comentarioDesempate: null,
        ...fase,
      },
    });
    iniciarMock.mockImplementation(async (id, cantidad, fase) =>
      iniciada(id, cantidad, fase)
    );
    iniciarBracketMock.mockImplementation(async (id, cantidad, fase) =>
      iniciada(id, cantidad, fase)
    );
  });

  it('inicia un torneo en borrador y devuelve el torneo en curso con su primera fase', async () => {
    const resultado = await iniciarTorneo(1, USUARIO_ID);

    expect(resultado.torneo.estado).toBe('en_curso');
    expect(resultado.fase).toMatchObject({
      torneoId: 1,
      tipo: 'liga',
      orden: 1,
      estado: 'activa',
      idaYVuelta: false,
    });
  });

  it.each([
    ['liga_simple', 'liga', false],
    ['liga_doble', 'liga', true],
    ['eliminacion_simple', 'eliminacion', false],
    ['eliminacion_doble', 'eliminacion', true],
    ['liguilla_eliminacion', 'liga', false],
    ['grupos_eliminatorias', 'grupos', false],
  ] as const)(
    'con formato %s crea una fase %s (idaYVuelta: %s)',
    async (formato, tipo, idaYVuelta) => {
      const usaGrupos = formato === 'grupos_eliminatorias';
      buscarMock.mockResolvedValue({
        ...torneoLiga,
        formato,
        cantidadGrupos: usaGrupos ? 2 : null,
      });
      listarEquiposMock.mockResolvedValue(equiposDe(8, usaGrupos ? 1 : null));

      await iniciarTorneo(1, USUARIO_ID);

      // La eliminación (simple o doble) guarda el cuadro con su propia función.
      const llamado = tipo === 'eliminacion' ? iniciarBracketMock : iniciarMock;

      expect(llamado).toHaveBeenCalledWith(
        1,
        8,
        { tipo, orden: 1, idaYVuelta },
        expect.any(Array)
      );
    }
  );

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
      buscarMock.mockResolvedValue({ ...torneoLiga, formato });
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
      buscarMock.mockResolvedValue({
        ...torneoLiga,
        formato: 'eliminacion_simple',
      });
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
      buscarMock.mockResolvedValue({
        ...torneoLiga,
        formato: 'eliminacion_doble',
      });
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
