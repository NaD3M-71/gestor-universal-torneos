import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bracketRepository from '@repositories/bracket.repository';
import * as posicionRepository from '@repositories/posicion.repository';
import { armarRondas, obtenerBracket } from '@services/bracket.service';
import { obtenerTorneo } from '@services/torneo.service';
import type { EnfrentamientoDeBracket } from '../../src/types/bracket';
import type { FasePublica } from '../../src/types/fase';
import type { TorneoPublico } from '../../src/types/torneo';

// Se reemplazan los repositorios (sin base de datos) y la búsqueda de torneos,
// que ya tiene sus propios tests.
vi.mock('@repositories/bracket.repository', () => ({
  listarEnfrentamientosDeFase: vi.fn(),
}));
vi.mock('@repositories/posicion.repository', () => ({
  listarFasesDeTorneo: vi.fn(),
}));
vi.mock('@services/torneo.service', () => ({
  obtenerTorneo: vi.fn(),
}));

const enfrentamientosMock = vi.mocked(
  bracketRepository.listarEnfrentamientosDeFase
);
const fasesMock = vi.mocked(posicionRepository.listarFasesDeTorneo);
const obtenerTorneoMock = vi.mocked(obtenerTorneo);

const USUARIO_ID = 7;
const TORNEO_ID = 1;

const equipo = (id: number) => ({ id, nombre: `Equipo ${id}` });

const partido = (
  id: number,
  instancia: string,
  siguienteId: number | null,
  extra: Partial<EnfrentamientoDeBracket> = {}
): EnfrentamientoDeBracket => ({
  id,
  instancia,
  siguienteId,
  resultadoA: null,
  resultadoB: null,
  ganadorId: null,
  equipoA: null,
  equipoB: null,
  ...extra,
});

/**
 * Cuadro de 6 equipos (tamaño 8) tal como lo guarda la creación: de la final
 * hacia la primera ronda. El cuarto 4 es un bye del equipo 1 (ya promovido).
 */
const cuadroDeSeis = (): EnfrentamientoDeBracket[] => [
  partido(1, 'final', null),
  partido(2, 'semifinal', 1, { equipoA: equipo(1) }),
  partido(3, 'semifinal', 1),
  partido(4, 'cuartos', 2, {
    equipoA: equipo(1),
    ganadorId: 1,
  }),
  partido(5, 'cuartos', 2, { equipoA: equipo(4), equipoB: equipo(5) }),
  partido(6, 'cuartos', 3, { equipoA: equipo(2), equipoB: equipo(7) }),
  partido(7, 'cuartos', 3, { equipoA: equipo(3), equipoB: equipo(6) }),
];

describe('armarRondas', () => {
  it('sin enfrentamientos devuelve una lista vacía', () => {
    expect(armarRondas([])).toEqual([]);
  });

  it('agrupa en rondas de la primera a la final, con el nombre de cada instancia', () => {
    const rondas = armarRondas(cuadroDeSeis());

    expect(rondas.map((r) => [r.ronda, r.instancia])).toEqual([
      [1, 'cuartos'],
      [2, 'semifinal'],
      [3, 'final'],
    ]);
    expect(rondas.map((r) => r.partidos.map((p) => p.id))).toEqual([
      [4, 5, 6, 7],
      [2, 3],
      [1],
    ]);
  });

  it('numera los partidos dentro de cada ronda, sin importar el orden de entrada', () => {
    const rondas = armarRondas([...cuadroDeSeis()].reverse());

    expect(rondas[0]?.partidos.map((p) => p.numeroEnRonda)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(rondas[0]?.partidos.map((p) => p.id)).toEqual([4, 5, 6, 7]);
  });

  it('el partido de menor id de cada par entra como A al siguiente y el otro como B', () => {
    const rondas = armarRondas(cuadroDeSeis());
    const lados = rondas.flatMap((r) =>
      r.partidos.map((p) => [p.id, p.ladoSiguiente])
    );

    expect(lados).toEqual([
      [4, 'A'],
      [5, 'B'],
      [6, 'A'],
      [7, 'B'],
      [2, 'A'],
      [3, 'B'],
      [1, null],
    ]);
  });

  it('marca como bye solo el partido de primera ronda sin equipo B', () => {
    const partidos = armarRondas(cuadroDeSeis()).flatMap((r) => r.partidos);

    expect(partidos.filter((p) => p.esBye).map((p) => p.id)).toEqual([4]);
  });

  it('un partido de una ronda futura sin equipos todavía no es bye', () => {
    const rondas = armarRondas(cuadroDeSeis());

    expect(rondas[2]?.partidos[0]).toMatchObject({
      equipoA: null,
      equipoB: null,
      esBye: false,
    });
  });

  it('con 2 equipos hay una sola ronda, la final', () => {
    const rondas = armarRondas([
      partido(1, 'final', null, { equipoA: equipo(1), equipoB: equipo(2) }),
    ]);

    expect(rondas).toHaveLength(1);
    expect(rondas[0]).toMatchObject({ ronda: 1, instancia: 'final' });
  });
});

describe('obtenerBracket', () => {
  const faseEliminacion: FasePublica = {
    id: 10,
    torneoId: TORNEO_ID,
    tipo: 'eliminacion',
    orden: 1,
    estado: 'activa',
    lineaDeCorte: null,
    idaYVuelta: false,
    comentarioDesempate: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    obtenerTorneoMock.mockResolvedValue({
      id: TORNEO_ID,
    } as TorneoPublico);
    fasesMock.mockResolvedValue([faseEliminacion]);
    enfrentamientosMock.mockResolvedValue(cuadroDeSeis());
  });

  it('devuelve el cuadro de la fase activa con sus rondas', async () => {
    const bracket = await obtenerBracket(TORNEO_ID, USUARIO_ID);

    expect(enfrentamientosMock).toHaveBeenCalledWith(10);
    expect(bracket).toMatchObject({
      faseId: 10,
      estado: 'activa',
      idaYVuelta: false,
    });
    expect(bracket.rondas).toHaveLength(3);
  });

  it('comprueba que el torneo sea del organizador antes de buscar nada', async () => {
    await obtenerBracket(TORNEO_ID, USUARIO_ID);

    expect(obtenerTorneoMock).toHaveBeenCalledWith(TORNEO_ID, USUARIO_ID);
  });

  it('propaga el 404 si el torneo no existe o es de otro organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      Object.assign(new Error('Torneo no encontrado.'), { statusCode: 404 })
    );

    await expect(obtenerBracket(TORNEO_ID, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(enfrentamientosMock).not.toHaveBeenCalled();
  });

  it('usa la fase pedida por faseId', async () => {
    fasesMock.mockResolvedValue([
      { ...faseEliminacion, id: 11, orden: 2, estado: 'cerrada' },
      faseEliminacion,
    ]);

    const bracket = await obtenerBracket(TORNEO_ID, USUARIO_ID, 11);

    expect(bracket.faseId).toBe(11);
    expect(enfrentamientosMock).toHaveBeenCalledWith(11);
  });

  it('responde 404 si la fase pedida no es del torneo', async () => {
    await expect(
      obtenerBracket(TORNEO_ID, USUARIO_ID, 99)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('responde 409 si la fase no es de eliminación', async () => {
    fasesMock.mockResolvedValue([{ ...faseEliminacion, tipo: 'liga' }]);

    await expect(obtenerBracket(TORNEO_ID, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(enfrentamientosMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el torneo todavía no tiene fases', async () => {
    fasesMock.mockResolvedValue([]);

    await expect(obtenerBracket(TORNEO_ID, USUARIO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('una fase sin partidos (eliminación doble, por ahora) devuelve rondas vacías', async () => {
    fasesMock.mockResolvedValue([{ ...faseEliminacion, idaYVuelta: true }]);
    enfrentamientosMock.mockResolvedValue([]);

    const bracket = await obtenerBracket(TORNEO_ID, USUARIO_ID);

    expect(bracket).toMatchObject({ idaYVuelta: true, rondas: [] });
  });
});
