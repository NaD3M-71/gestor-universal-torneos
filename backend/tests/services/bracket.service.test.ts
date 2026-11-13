import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bracketRepository from '@repositories/bracket.repository';
import * as posicionRepository from '@repositories/posicion.repository';
import {
  armarRondas,
  armarRondasIdaYVuelta,
  obtenerBracket,
} from '@services/bracket.service';
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
  vueltaDeId: null,
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

/**
 * Cuadro de 4 equipos a ida y vuelta tal como lo guarda la creación: de la
 * final hacia la primera ronda, la ida antes que su vuelta. Solo la vuelta
 * apunta al cruce siguiente (a su ida) y a su propia ida.
 */
const cuadroDeCuatroIdaYVuelta = (): EnfrentamientoDeBracket[] => [
  partido(1, 'final_ida', null),
  partido(2, 'final_vuelta', null, { vueltaDeId: 1 }),
  partido(3, 'semifinal_ida', null, { equipoA: equipo(1), equipoB: equipo(4) }),
  partido(4, 'semifinal_vuelta', 1, {
    vueltaDeId: 3,
    equipoA: equipo(4),
    equipoB: equipo(1),
  }),
  partido(5, 'semifinal_ida', null, { equipoA: equipo(2), equipoB: equipo(3) }),
  partido(6, 'semifinal_vuelta', 1, {
    vueltaDeId: 5,
    equipoA: equipo(3),
    equipoB: equipo(2),
  }),
];

/** Cuadro de 3 equipos a ida y vuelta: la semifinal 1 es un bye del equipo 1. */
const cuadroDeTresIdaYVuelta = (): EnfrentamientoDeBracket[] => [
  partido(1, 'final_ida', null),
  partido(2, 'final_vuelta', null, { vueltaDeId: 1 }),
  partido(3, 'semifinal', 1, { equipoA: equipo(1), ganadorId: 1 }),
  partido(4, 'semifinal_ida', null, { equipoA: equipo(2), equipoB: equipo(3) }),
  partido(5, 'semifinal_vuelta', 1, {
    vueltaDeId: 4,
    equipoA: equipo(3),
    equipoB: equipo(2),
  }),
];

describe('armarRondasIdaYVuelta', () => {
  it('sin enfrentamientos devuelve una lista vacía', () => {
    expect(armarRondasIdaYVuelta([])).toEqual([]);
  });

  it('agrupa los cruces en rondas de la primera a la final, sin el sufijo de ida o vuelta', () => {
    const rondas = armarRondasIdaYVuelta(cuadroDeCuatroIdaYVuelta());

    expect(rondas.map((r) => [r.ronda, r.instancia])).toEqual([
      [1, 'semifinal'],
      [2, 'final'],
    ]);
    expect(
      rondas.map((r) => r.cruces.map((c) => [c.ida.id, c.vuelta?.id ?? null]))
    ).toEqual([
      [
        [3, 4],
        [5, 6],
      ],
      [[1, 2]],
    ]);
  });

  it('la ida no apunta a nadie y la vuelta apunta a la ida del cruce siguiente', () => {
    const [semifinales] = armarRondasIdaYVuelta(cuadroDeCuatroIdaYVuelta());

    semifinales?.cruces.forEach((cruce) => {
      expect(cruce.ida.siguienteId).toBeNull();
      expect(cruce.ida.ladoSiguiente).toBeNull();
      expect(cruce.vuelta?.siguienteId).toBe(1);
    });
  });

  it('de las dos vueltas que alimentan a la final, la de menor id entra como A y la otra como B', () => {
    const [semifinales] = armarRondasIdaYVuelta(cuadroDeCuatroIdaYVuelta());

    expect(semifinales?.cruces.map((c) => c.vuelta?.ladoSiguiente)).toEqual([
      'A',
      'B',
    ]);
  });

  it('la ida y la vuelta de un cruce comparten su número en la ronda', () => {
    const [semifinales] = armarRondasIdaYVuelta(cuadroDeCuatroIdaYVuelta());

    expect(
      semifinales?.cruces.map((c) => [
        c.numeroEnRonda,
        c.ida.numeroEnRonda,
        c.vuelta?.numeroEnRonda,
      ])
    ).toEqual([
      [1, 1, 1],
      [2, 2, 2],
    ]);
  });

  it('no depende del orden en que lleguen los enfrentamientos', () => {
    const alReves = [...cuadroDeCuatroIdaYVuelta()].reverse();

    expect(armarRondasIdaYVuelta(alReves)).toEqual(
      armarRondasIdaYVuelta(cuadroDeCuatroIdaYVuelta())
    );
  });

  it('quien avanza en el cruce es el ganador de la vuelta, y null mientras no se defina', () => {
    const cuadro = cuadroDeCuatroIdaYVuelta();
    const vuelta = cuadro.find((p) => p.id === 4);
    if (vuelta) {
      vuelta.ganadorId = 1;
    }

    const [semifinales] = armarRondasIdaYVuelta(cuadro);

    expect(semifinales?.cruces.map((c) => c.ganadorId)).toEqual([1, null]);
  });

  it('un bye es un cruce de un solo partido: sin vuelta, con ganador y apuntando al siguiente', () => {
    const [semifinales] = armarRondasIdaYVuelta(cuadroDeTresIdaYVuelta());
    const [bye, normal] = semifinales?.cruces ?? [];

    expect(semifinales?.instancia).toBe('semifinal');
    expect(bye).toMatchObject({
      vuelta: null,
      ganadorId: 1,
      ida: { id: 3, esBye: true, siguienteId: 1, ladoSiguiente: 'A' },
    });
    expect(normal).toMatchObject({
      ida: { id: 4, esBye: false },
      vuelta: { id: 5, siguienteId: 1, ladoSiguiente: 'B' },
    });
  });

  it('con 2 equipos hay una sola ronda, la final', () => {
    const rondas = armarRondasIdaYVuelta([
      partido(1, 'final_ida', null),
      partido(2, 'final_vuelta', null, { vueltaDeId: 1 }),
    ]);

    expect(rondas).toHaveLength(1);
    expect(rondas[0]?.instancia).toBe('final');
    expect(rondas[0]?.cruces[0]?.vuelta?.siguienteId).toBeNull();
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

  it('una fase a ida y vuelta sin partidos devuelve rondas vacías', async () => {
    fasesMock.mockResolvedValue([{ ...faseEliminacion, idaYVuelta: true }]);
    enfrentamientosMock.mockResolvedValue([]);

    const bracket = await obtenerBracket(TORNEO_ID, USUARIO_ID);

    expect(bracket).toMatchObject({ idaYVuelta: true, rondas: [] });
  });

  it('una fase a ida y vuelta devuelve las rondas con cruces ida/vuelta', async () => {
    fasesMock.mockResolvedValue([{ ...faseEliminacion, idaYVuelta: true }]);
    enfrentamientosMock.mockResolvedValue(cuadroDeCuatroIdaYVuelta());

    const bracket = await obtenerBracket(TORNEO_ID, USUARIO_ID);

    expect(bracket.idaYVuelta).toBe(true);
    if (bracket.idaYVuelta) {
      expect(bracket.rondas.map((r) => r.cruces.length)).toEqual([2, 1]);
    }
  });
});
