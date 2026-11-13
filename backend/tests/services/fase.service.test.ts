import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as faseRepository from '@repositories/fase.repository';
import {
  calcularVentajasDeDesempate,
  cerrarFase,
  resolverDesempate,
} from '@services/fase.service';
import {
  calcularEmpatesDeFase,
  calcularTablaDeFase,
} from '@services/posicion.service';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../../src/middlewares/errors/AppError';
import type { FasePublica } from '../../src/types/fase';
import type { Empate, FilaPosicion } from '../../src/types/posicion';
import type { TorneoPublico } from '../../src/types/torneo';

// Se reemplazan el repositorio (sin base de datos) y la búsqueda de torneos,
// que ya tiene sus propios tests.
vi.mock('@repositories/fase.repository', () => ({
  buscarFasePorId: vi.fn(),
  contarPendientesDeLiga: vi.fn(),
  contarPendientesDeEliminacion: vi.fn(),
  cerrarFase: vi.fn(),
  guardarDesempate: vi.fn(),
}));
vi.mock('@services/torneo.service', () => ({
  obtenerTorneo: vi.fn(),
}));
vi.mock('@services/posicion.service', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('@services/posicion.service')>()),
  calcularEmpatesDeFase: vi.fn(),
  calcularTablaDeFase: vi.fn(),
}));

const obtenerTorneoMock = vi.mocked(obtenerTorneo);
const empatesMock = vi.mocked(calcularEmpatesDeFase);
const buscarFaseMock = vi.mocked(faseRepository.buscarFasePorId);
const pendientesLigaMock = vi.mocked(faseRepository.contarPendientesDeLiga);
const pendientesEliminacionMock = vi.mocked(
  faseRepository.contarPendientesDeEliminacion
);
const cerrarFaseMock = vi.mocked(faseRepository.cerrarFase);
const tablaMock = vi.mocked(calcularTablaDeFase);
const guardarMock = vi.mocked(faseRepository.guardarDesempate);

const USUARIO_ID = 7;
const TORNEO_ID = 1;
const FASE_ID = 10;

const torneo = (extra: Partial<TorneoPublico> = {}): TorneoPublico => ({
  id: TORNEO_ID,
  creadorId: USUARIO_ID,
  nombre: 'Liga barrial',
  descripcion: null,
  formato: 'liga_simple',
  sistemaPuntuacion: 'futbol_clasico',
  cantidadParticipantes: 4,
  cantidadGrupos: null,
  fechaInicio: null,
  estado: 'en_curso',
  campeonId: null,
  ...extra,
});

const fase = (extra: Partial<FasePublica> = {}): FasePublica => ({
  id: FASE_ID,
  torneoId: TORNEO_ID,
  tipo: 'liga',
  orden: 1,
  estado: 'activa',
  lineaDeCorte: null,
  idaYVuelta: false,
  comentarioDesempate: null,
  ...extra,
});

const empate = (): Empate => ({
  grupo: null,
  desdePosicion: 1,
  hastaPosicion: 2,
  puntos: 3,
  equipos: [],
  directos: [],
});

/** Ejecuta cerrarFase y devuelve el error que lanza (falla si no lanza). */
const errorAlCerrar = async (): Promise<AppError> => {
  try {
    await cerrarFase(TORNEO_ID, FASE_ID, USUARIO_ID);
  } catch (error) {
    return error as AppError;
  }
  throw new Error('Se esperaba que cerrarFase lanzara un error.');
};

describe('cerrarFase', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    obtenerTorneoMock.mockResolvedValue(torneo());
    buscarFaseMock.mockResolvedValue(fase());
    pendientesLigaMock.mockResolvedValue(0);
    pendientesEliminacionMock.mockResolvedValue(0);
    cerrarFaseMock.mockResolvedValue(fase({ estado: 'cerrada' }));
    empatesMock.mockResolvedValue({
      faseId: FASE_ID,
      lineaDeCorte: 1,
      empates: [],
    });
  });

  it('cierra una fase de liga con todos los partidos jugados', async () => {
    const resultado = await cerrarFase(TORNEO_ID, FASE_ID, USUARIO_ID);

    expect(resultado.estado).toBe('cerrada');
    expect(obtenerTorneoMock).toHaveBeenCalledWith(TORNEO_ID, USUARIO_ID);
    expect(pendientesLigaMock).toHaveBeenCalledWith(FASE_ID);
    expect(pendientesEliminacionMock).not.toHaveBeenCalled();
    expect(cerrarFaseMock).toHaveBeenCalledWith(FASE_ID);
  });

  it('cuenta los pendientes de grupos igual que los de liga', async () => {
    buscarFaseMock.mockResolvedValue(fase({ tipo: 'grupos' }));

    await cerrarFase(TORNEO_ID, FASE_ID, USUARIO_ID);

    expect(pendientesLigaMock).toHaveBeenCalledWith(FASE_ID);
    expect(pendientesEliminacionMock).not.toHaveBeenCalled();
  });

  it('cierra una fase de eliminación con todos los cruces resueltos', async () => {
    buscarFaseMock.mockResolvedValue(fase({ tipo: 'eliminacion' }));

    const resultado = await cerrarFase(TORNEO_ID, FASE_ID, USUARIO_ID);

    expect(resultado.estado).toBe('cerrada');
    expect(pendientesEliminacionMock).toHaveBeenCalledWith(FASE_ID);
    expect(pendientesLigaMock).not.toHaveBeenCalled();
  });

  it('responde 404 si el torneo no es del organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(404);
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('responde 404 si la fase no existe', async () => {
    buscarFaseMock.mockResolvedValue(null);

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(404);
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('responde 404 si la fase es de otro torneo', async () => {
    buscarFaseMock.mockResolvedValue(fase({ torneoId: 99 }));

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(404);
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el torneo no está en curso', async () => {
    obtenerTorneoMock.mockResolvedValue(torneo({ estado: 'finalizado' }));

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(409);
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('responde 409 si la fase ya está cerrada', async () => {
    buscarFaseMock.mockResolvedValue(fase({ estado: 'cerrada' }));

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('La fase ya está cerrada.');
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('responde 409 con la cantidad de partidos que faltan', async () => {
    pendientesLigaMock.mockResolvedValue(3);

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(409);
    expect(error.message).toContain('Faltan 3 partidos');
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('usa el singular cuando falta un solo partido', async () => {
    pendientesLigaMock.mockResolvedValue(1);

    const error = await errorAlCerrar();

    expect(error.message).toContain('Falta 1 partido');
  });

  it('no deja cerrar una eliminación con cruces sin ganador', async () => {
    buscarFaseMock.mockResolvedValue(fase({ tipo: 'eliminacion' }));
    pendientesEliminacionMock.mockResolvedValue(2);

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(409);
    expect(error.message).toContain('Faltan 2 partidos');
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });
});

describe('cerrarFase con empates en puntos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    obtenerTorneoMock.mockResolvedValue(torneo());
    buscarFaseMock.mockResolvedValue(fase());
    pendientesLigaMock.mockResolvedValue(0);
    pendientesEliminacionMock.mockResolvedValue(0);
    cerrarFaseMock.mockResolvedValue(fase({ estado: 'cerrada' }));
    empatesMock.mockResolvedValue({
      faseId: FASE_ID,
      lineaDeCorte: 1,
      empates: [],
    });
  });

  it('consulta los empates de la fase con el sistema de puntuación del torneo', async () => {
    await cerrarFase(TORNEO_ID, FASE_ID, USUARIO_ID);

    expect(empatesMock).toHaveBeenCalledWith(
      TORNEO_ID,
      fase(),
      'futbol_clasico'
    );
  });

  it('responde 409 si hay un empate relevante sin resolver', async () => {
    empatesMock.mockResolvedValue({
      faseId: FASE_ID,
      lineaDeCorte: 1,
      empates: [empate()],
    });

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(409);
    expect(error.message).toContain('Hay 1 empate');
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('usa el plural cuando hay más de un empate', async () => {
    empatesMock.mockResolvedValue({
      faseId: FASE_ID,
      lineaDeCorte: 4,
      empates: [empate(), empate()],
    });

    const error = await errorAlCerrar();

    expect(error.message).toContain('Hay 2 empates');
  });

  it('también bloquea en una fase de grupos', async () => {
    buscarFaseMock.mockResolvedValue(fase({ tipo: 'grupos' }));
    empatesMock.mockResolvedValue({
      faseId: FASE_ID,
      lineaDeCorte: 2,
      empates: [empate()],
    });

    const error = await errorAlCerrar();

    expect(error.statusCode).toBe(409);
    expect(cerrarFaseMock).not.toHaveBeenCalled();
  });

  it('no mira los empates si todavía faltan partidos (avisa de los partidos)', async () => {
    pendientesLigaMock.mockResolvedValue(2);

    const error = await errorAlCerrar();

    expect(error.message).toContain('Faltan 2 partidos');
    expect(empatesMock).not.toHaveBeenCalled();
  });

  it('no mira empates en una fase de eliminación', async () => {
    buscarFaseMock.mockResolvedValue(fase({ tipo: 'eliminacion' }));

    const resultado = await cerrarFase(TORNEO_ID, FASE_ID, USUARIO_ID);

    expect(resultado.estado).toBe('cerrada');
    expect(empatesMock).not.toHaveBeenCalled();
  });
});

const fila = (
  equipoId: number,
  posicion: number,
  puntos: number,
  ventajaDesempate = 0
): FilaPosicion => ({
  posicion,
  equipoId,
  nombre: `Equipo ${equipoId}`,
  grupo: null,
  pj: 3,
  pg: 0,
  pe: 0,
  pp: 0,
  puntos,
  aFavor: 0,
  enContra: 0,
  diferencia: 0,
  ventajaDesempate,
});

describe('calcularVentajasDeDesempate', () => {
  it('da la mayor ventaja al primero y 0 al último', () => {
    const grupo = [fila(1, 1, 6), fila(2, 1, 6), fila(3, 1, 6)];

    expect(calcularVentajasDeDesempate(grupo, [2, 3, 1])).toEqual([
      { equipoId: 2, ventajaDesempate: 2 },
      { equipoId: 3, ventajaDesempate: 1 },
    ]);
  });

  it('conserva el lugar de los equipos con otra ventaja en el grupo', () => {
    // 4 ya estaba por encima (ventaja 1); 5 por debajo (ventaja -1).
    const grupo = [
      fila(4, 1, 6, 1),
      fila(1, 2, 6),
      fila(2, 2, 6),
      fila(5, 4, 6, -1),
    ];

    const resultado = calcularVentajasDeDesempate(grupo, [2, 1]);
    const ventajas = new Map(
      grupo.map((f) => [f.equipoId, f.ventajaDesempate])
    );
    resultado.forEach((v) => ventajas.set(v.equipoId, v.ventajaDesempate));

    expect(ventajas.get(4)).toBeGreaterThan(ventajas.get(2) as number);
    expect(ventajas.get(2)).toBeGreaterThan(ventajas.get(1) as number);
    expect(ventajas.get(1)).toBeGreaterThan(ventajas.get(5) as number);
  });

  it('no toca a los equipos cuya ventaja no cambia', () => {
    const grupo = [fila(1, 1, 6), fila(2, 1, 6)];

    expect(calcularVentajasDeDesempate(grupo, [1, 2])).toEqual([
      { equipoId: 1, ventajaDesempate: 1 },
    ]);
  });
});

describe('resolverDesempate', () => {
  const resolver = (orden: number[], comentario?: string | null) =>
    resolverDesempate(TORNEO_ID, FASE_ID, USUARIO_ID, orden, comentario);

  const errorAlResolver = async (orden: number[]): Promise<AppError> => {
    try {
      await resolver(orden);
    } catch (error) {
      return error as AppError;
    }
    throw new Error('Se esperaba que resolverDesempate lanzara un error.');
  };

  beforeEach(() => {
    vi.resetAllMocks();
    obtenerTorneoMock.mockResolvedValue(torneo());
    buscarFaseMock.mockResolvedValue(fase());
    pendientesLigaMock.mockResolvedValue(0);
    tablaMock.mockResolvedValue({
      filas: [fila(1, 1, 6), fila(2, 1, 6), fila(3, 3, 3), fila(4, 4, 0)],
      jugados: [],
    });
    guardarMock.mockResolvedValue(fase({ comentarioDesempate: 'Por goles' }));
    empatesMock.mockResolvedValue({
      faseId: FASE_ID,
      lineaDeCorte: 1,
      empates: [],
    });
  });

  it('guarda las ventajas según el orden y devuelve los empates restantes', async () => {
    const resultado = await resolver([2, 1], 'Por goles');

    expect(guardarMock).toHaveBeenCalledWith(
      FASE_ID,
      [{ equipoId: 2, ventajaDesempate: 1 }],
      'Por goles'
    );
    expect(resultado.fase.comentarioDesempate).toBe('Por goles');
    expect(resultado.empates).toEqual([]);
  });

  it('no pasa comentario si no viene (queda el anterior)', async () => {
    await resolver([1, 2]);

    expect(guardarMock.mock.calls[0]?.[2]).toBeUndefined();
  });

  it('responde 409 si los equipos no son un empate pendiente', async () => {
    const error = await errorAlResolver([3, 4]);

    expect(error.statusCode).toBe(409);
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el orden incluye solo una parte del empate', async () => {
    tablaMock.mockResolvedValue({
      filas: [fila(1, 1, 6), fila(2, 1, 6), fila(3, 1, 6)],
      jugados: [],
    });

    const error = await errorAlResolver([1, 2]);

    expect(error.statusCode).toBe(409);
  });

  it('responde 409 si faltan partidos por jugar', async () => {
    pendientesLigaMock.mockResolvedValue(2);

    const error = await errorAlResolver([1, 2]);

    expect(error.statusCode).toBe(409);
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('responde 409 si la fase ya está cerrada', async () => {
    buscarFaseMock.mockResolvedValue(fase({ estado: 'cerrada' }));

    expect((await errorAlResolver([1, 2])).statusCode).toBe(409);
  });

  it('responde 409 en una fase de eliminación', async () => {
    buscarFaseMock.mockResolvedValue(fase({ tipo: 'eliminacion' }));

    expect((await errorAlResolver([1, 2])).statusCode).toBe(409);
  });

  it('responde 409 si el torneo no está en curso', async () => {
    obtenerTorneoMock.mockResolvedValue(torneo({ estado: 'borrador' }));

    expect((await errorAlResolver([1, 2])).statusCode).toBe(409);
  });

  it('responde 404 si la fase es de otro torneo', async () => {
    buscarFaseMock.mockResolvedValue(fase({ torneoId: 99 }));

    expect((await errorAlResolver([1, 2])).statusCode).toBe(404);
  });
});
