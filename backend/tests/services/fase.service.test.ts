import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as faseRepository from '@repositories/fase.repository';
import { cerrarFase } from '@services/fase.service';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../../src/middlewares/errors/AppError';
import type { FasePublica } from '../../src/types/fase';
import type { TorneoPublico } from '../../src/types/torneo';

// Se reemplazan el repositorio (sin base de datos) y la búsqueda de torneos,
// que ya tiene sus propios tests.
vi.mock('@repositories/fase.repository', () => ({
  buscarFasePorId: vi.fn(),
  contarPendientesDeLiga: vi.fn(),
  contarPendientesDeEliminacion: vi.fn(),
  cerrarFase: vi.fn(),
}));
vi.mock('@services/torneo.service', () => ({
  obtenerTorneo: vi.fn(),
}));

const obtenerTorneoMock = vi.mocked(obtenerTorneo);
const buscarFaseMock = vi.mocked(faseRepository.buscarFasePorId);
const pendientesLigaMock = vi.mocked(faseRepository.contarPendientesDeLiga);
const pendientesEliminacionMock = vi.mocked(
  faseRepository.contarPendientesDeEliminacion
);
const cerrarFaseMock = vi.mocked(faseRepository.cerrarFase);

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
