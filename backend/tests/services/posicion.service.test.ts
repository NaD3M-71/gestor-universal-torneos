import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as posicionRepository from '@repositories/posicion.repository';
import {
  calcularPosiciones,
  detectarEmpatesRelevantes,
  elegirFase,
  LINEA_DE_CORTE_POR_DEFECTO,
  obtenerEmpates,
  obtenerPosiciones,
  PUNTOS_POR_SISTEMA,
} from '@services/posicion.service';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../../src/middlewares/errors/AppError';
import type { FasePublica } from '../../src/types/fase';
import type {
  EnfrentamientoJugado,
  EquipoParaTabla,
} from '../../src/types/posicion';
import type { TorneoPublico } from '../../src/types/torneo';

// Se reemplazan el repositorio (sin base de datos) y la búsqueda de torneos,
// que ya tiene sus propios tests.
vi.mock('@repositories/posicion.repository', () => ({
  listarFasesDeTorneo: vi.fn(),
  listarEquiposParaTabla: vi.fn(),
  listarEnfrentamientosJugados: vi.fn(),
}));
vi.mock('@services/torneo.service', () => ({
  obtenerTorneo: vi.fn(),
}));

const fasesMock = vi.mocked(posicionRepository.listarFasesDeTorneo);
const equiposMock = vi.mocked(posicionRepository.listarEquiposParaTabla);
const jugadosMock = vi.mocked(posicionRepository.listarEnfrentamientosJugados);
const obtenerTorneoMock = vi.mocked(obtenerTorneo);

const USUARIO_ID = 7;
const TORNEO_ID = 1;

const ALFA = 1;
const BETA = 2;
const GAMA = 3;
const DELTA = 4;

const equipo = (
  id: number,
  nombre: string,
  extra: Partial<EquipoParaTabla> = {}
): EquipoParaTabla => ({
  id,
  nombre,
  grupo: null,
  ventajaDesempate: 0,
  ...extra,
});

const equipos: EquipoParaTabla[] = [
  equipo(ALFA, 'Alfa'),
  equipo(BETA, 'Beta'),
  equipo(GAMA, 'Gama'),
  equipo(DELTA, 'Delta'),
];

const partido = (
  equipoAId: number,
  equipoBId: number,
  resultadoA: number | null,
  resultadoB: number | null,
  ganadorId: number | null
): EnfrentamientoJugado => ({
  equipoAId,
  equipoBId,
  resultadoA,
  resultadoB,
  ganadorId,
});

const fase = (id: number, extra: Partial<FasePublica> = {}): FasePublica => ({
  id,
  torneoId: TORNEO_ID,
  tipo: 'liga',
  orden: 1,
  estado: 'activa',
  lineaDeCorte: null,
  idaYVuelta: false,
  comentarioDesempate: null,
  ...extra,
});

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

type Tabla = ReturnType<typeof calcularPosiciones>;

const fila = (tabla: Tabla, equipoId: number) => {
  const encontrada = tabla.find((f) => f.equipoId === equipoId);
  if (encontrada === undefined) {
    throw new Error(`El equipo ${equipoId} no está en la tabla.`);
  }
  return encontrada;
};

const nombresEnOrden = (tabla: Tabla) => tabla.map((f) => f.nombre);

/** Código de estado del AppError que lanza la función (undefined si no lanza). */
const codigoDe = (accion: () => unknown): number | undefined => {
  try {
    accion();
  } catch (error) {
    return (error as AppError).statusCode;
  }
  return undefined;
};

beforeEach(() => {
  vi.resetAllMocks();
  obtenerTorneoMock.mockResolvedValue(torneoEnCurso);
  fasesMock.mockResolvedValue([fase(3)]);
  equiposMock.mockResolvedValue(equipos);
  jugadosMock.mockResolvedValue([]);
});

describe('PUNTOS_POR_SISTEMA', () => {
  it.each([
    ['ganada_perdida', { victoria: 1, empate: 0 }],
    ['futbol_clasico', { victoria: 3, empate: 1 }],
    ['sistema_alternativo', { victoria: 2, empate: 1 }],
  ] as const)('%s', (sistema, esperado) => {
    expect(PUNTOS_POR_SISTEMA[sistema]).toEqual(esperado);
  });
});

describe('calcularPosiciones', () => {
  const clasico = PUNTOS_POR_SISTEMA.futbol_clasico;

  it('con fútbol clásico suma 3 por victoria, 1 por empate y 0 por derrota', () => {
    const tabla = calcularPosiciones(
      equipos,
      [partido(ALFA, BETA, 2, 1, ALFA), partido(GAMA, DELTA, 0, 0, null)],
      clasico
    );

    expect(fila(tabla, ALFA)).toMatchObject({
      pj: 1,
      pg: 1,
      pe: 0,
      pp: 0,
      puntos: 3,
      aFavor: 2,
      enContra: 1,
      diferencia: 1,
    });
    expect(fila(tabla, BETA)).toMatchObject({
      pj: 1,
      pg: 0,
      pe: 0,
      pp: 1,
      puntos: 0,
      aFavor: 1,
      enContra: 2,
      diferencia: -1,
    });
    expect(fila(tabla, GAMA)).toMatchObject({ pj: 1, pe: 1, puntos: 1 });
    expect(fila(tabla, DELTA)).toMatchObject({ pj: 1, pe: 1, puntos: 1 });
  });

  it('con sistema alternativo suma 2 por victoria y 1 por empate', () => {
    const tabla = calcularPosiciones(
      equipos,
      [partido(ALFA, BETA, 1, 0, ALFA), partido(GAMA, DELTA, 1, 1, null)],
      PUNTOS_POR_SISTEMA.sistema_alternativo
    );

    expect(fila(tabla, ALFA).puntos).toBe(2);
    expect(fila(tabla, GAMA).puntos).toBe(1);
  });

  it('con ganada_perdida los puntos son los partidos ganados', () => {
    const tabla = calcularPosiciones(
      equipos,
      [partido(ALFA, BETA, null, null, BETA)],
      PUNTOS_POR_SISTEMA.ganada_perdida
    );

    expect(fila(tabla, BETA)).toMatchObject({ pg: 1, pe: 0, puntos: 1 });
    expect(fila(tabla, ALFA)).toMatchObject({ pp: 1, puntos: 0 });
  });

  it('un partido con ganador y sin marcador suma PG y PP pero no el marcador', () => {
    const tabla = calcularPosiciones(
      equipos,
      [partido(ALFA, BETA, null, null, ALFA)],
      clasico
    );

    expect(fila(tabla, ALFA)).toMatchObject({
      pg: 1,
      puntos: 3,
      aFavor: 0,
      enContra: 0,
      diferencia: 0,
    });
  });

  it('ordena por puntos de mayor a menor', () => {
    const tabla = calcularPosiciones(
      equipos,
      [partido(BETA, ALFA, 1, 0, BETA), partido(GAMA, DELTA, 0, 0, null)],
      clasico
    );

    expect(nombresEnOrden(tabla)).toEqual(['Beta', 'Delta', 'Gama', 'Alfa']);
    expect(tabla.map((f) => f.posicion)).toEqual([1, 2, 3, 4]);
  });

  it('a igualdad de puntos, la ventajaDesempate pesa más que la diferencia', () => {
    const conVentaja = [
      equipo(ALFA, 'Alfa'),
      equipo(BETA, 'Beta', { ventajaDesempate: 1 }),
      equipo(GAMA, 'Gama'),
      equipo(DELTA, 'Delta'),
    ];
    const tabla = calcularPosiciones(
      conVentaja,
      [partido(ALFA, GAMA, 5, 0, ALFA), partido(BETA, DELTA, 1, 0, BETA)],
      clasico
    );

    expect(nombresEnOrden(tabla).slice(0, 2)).toEqual(['Beta', 'Alfa']);
  });

  it('a igualdad de puntos y ventaja, desempata por diferencia', () => {
    const tabla = calcularPosiciones(
      equipos,
      [partido(ALFA, GAMA, 2, 1, ALFA), partido(BETA, DELTA, 4, 1, BETA)],
      clasico
    );

    expect(nombresEnOrden(tabla).slice(0, 2)).toEqual(['Beta', 'Alfa']);
  });

  it('si todo empata, ordena por nombre', () => {
    const tabla = calcularPosiciones(equipos, [], clasico);

    expect(nombresEnOrden(tabla)).toEqual(['Alfa', 'Beta', 'Delta', 'Gama']);
    expect(tabla.every((f) => f.pj === 0 && f.puntos === 0)).toBe(true);
  });

  it('con grupos, ordena por grupo y la posición reinicia en cada uno', () => {
    const enGrupos = [
      equipo(ALFA, 'Alfa', { grupo: 1 }),
      equipo(BETA, 'Beta', { grupo: 2 }),
      equipo(GAMA, 'Gama', { grupo: 1 }),
      equipo(DELTA, 'Delta', { grupo: 2 }),
    ];
    const tabla = calcularPosiciones(
      enGrupos,
      [partido(GAMA, ALFA, 1, 0, GAMA), partido(BETA, DELTA, 3, 0, BETA)],
      clasico
    );

    expect(tabla.map((f) => [f.nombre, f.grupo, f.posicion])).toEqual([
      ['Gama', 1, 1],
      ['Alfa', 1, 2],
      ['Beta', 2, 1],
      ['Delta', 2, 2],
    ]);
  });

  it('ignora un partido de un equipo que no está en la tabla', () => {
    const tabla = calcularPosiciones(
      equipos,
      [partido(ALFA, 999, 1, 0, ALFA)],
      clasico
    );

    expect(fila(tabla, ALFA).pj).toBe(0);
  });
});

describe('elegirFase', () => {
  // El repositorio las devuelve de la última a la primera.
  const fases = [
    fase(12, { orden: 2, tipo: 'eliminacion', estado: 'cerrada' }),
    fase(11, { orden: 1, estado: 'cerrada' }),
  ];

  it('devuelve la fase pedida por faseId', () => {
    expect(elegirFase(fases, 11).id).toBe(11);
  });

  it('responde 404 si la fase pedida no es del torneo', () => {
    expect(codigoDe(() => elegirFase(fases, 99))).toBe(404);
  });

  it('sin faseId elige la fase activa', () => {
    const conActiva = [fase(12, { orden: 2 }), fase(11, { estado: 'cerrada' })];

    expect(elegirFase(conActiva).id).toBe(12);
  });

  it('sin faseId y sin fase activa elige la última', () => {
    expect(elegirFase(fases).id).toBe(12);
  });

  it('responde 409 si el torneo todavía no tiene fases', () => {
    expect(codigoDe(() => elegirFase([]))).toBe(409);
  });
});

describe('obtenerPosiciones', () => {
  it('arma la tabla de la fase activa con el sistema del torneo', async () => {
    fasesMock.mockResolvedValue([
      fase(3, { comentarioDesempate: 'Pasa Alfa por penales.' }),
    ]);
    jugadosMock.mockResolvedValue([partido(ALFA, BETA, 2, 0, ALFA)]);

    const tabla = await obtenerPosiciones(TORNEO_ID, USUARIO_ID);

    expect(tabla.faseId).toBe(3);
    expect(tabla.sistemaPuntuacion).toBe('futbol_clasico');
    expect(tabla.comentarioDesempate).toBe('Pasa Alfa por penales.');
    expect(tabla.posiciones[0]).toMatchObject({ nombre: 'Alfa', puntos: 3 });
    expect(obtenerTorneoMock).toHaveBeenCalledWith(TORNEO_ID, USUARIO_ID);
    expect(jugadosMock).toHaveBeenCalledWith(3);
  });

  it('usa la fase pedida por faseId', async () => {
    fasesMock.mockResolvedValue([fase(4, { orden: 2 }), fase(3)]);

    const tabla = await obtenerPosiciones(TORNEO_ID, USUARIO_ID, 3);

    expect(tabla.faseId).toBe(3);
    expect(jugadosMock).toHaveBeenCalledWith(3);
  });

  it('responde 409 en una fase de eliminación y no busca partidos', async () => {
    fasesMock.mockResolvedValue([fase(3, { tipo: 'eliminacion' })]);

    await expect(
      obtenerPosiciones(TORNEO_ID, USUARIO_ID)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(equiposMock).not.toHaveBeenCalled();
    expect(jugadosMock).not.toHaveBeenCalled();
  });

  it('propaga el 404 si el torneo no existe o es de otro organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    await expect(
      obtenerPosiciones(TORNEO_ID, USUARIO_ID)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(fasesMock).not.toHaveBeenCalled();
  });
});

describe('detectarEmpatesRelevantes', () => {
  const puntos = PUNTOS_POR_SISTEMA.futbol_clasico;

  /** Tabla de los 4 equipos con los partidos dados (opcionalmente con otros equipos). */
  const tablaDe = (
    jugados: EnfrentamientoJugado[],
    lista: EquipoParaTabla[] = equipos
  ) => calcularPosiciones(lista, jugados, puntos);

  // Alfa y Gama ganan (3 puntos cada uno); Beta y Delta pierden (0).
  const dosGanadoresYDosPerdedores = [
    partido(ALFA, BETA, 1, 0, ALFA),
    partido(GAMA, DELTA, 1, 0, GAMA),
  ];

  it('no devuelve nada si no hay empates', () => {
    const jugados = [
      partido(ALFA, BETA, 1, 0, ALFA),
      partido(ALFA, GAMA, 1, 0, ALFA),
      partido(ALFA, DELTA, 1, 0, ALFA),
      partido(BETA, GAMA, 1, 0, BETA),
      partido(BETA, DELTA, 1, 0, BETA),
      partido(GAMA, DELTA, 1, 0, GAMA),
    ];

    expect(detectarEmpatesRelevantes(tablaDe(jugados), jugados, 2)).toEqual([]);
  });

  it('detecta un empate dentro de la zona de clasificados', () => {
    const jugados = dosGanadoresYDosPerdedores;

    const empates = detectarEmpatesRelevantes(tablaDe(jugados), jugados, 2);

    expect(empates).toHaveLength(1);
    expect(empates[0]).toMatchObject({
      grupo: null,
      desdePosicion: 1,
      hastaPosicion: 2,
      puntos: 3,
    });
    expect(empates[0]?.equipos.map((f) => f.equipoId)).toEqual([ALFA, GAMA]);
  });

  it('detecta un empate que cruza la línea de corte', () => {
    // Alfa gana todo (9 puntos); Beta, Gama y Delta quedan con 0, empatados del 2.° al 4.°.
    const jugados = [
      partido(ALFA, BETA, 1, 0, ALFA),
      partido(ALFA, GAMA, 1, 0, ALFA),
      partido(ALFA, DELTA, 1, 0, ALFA),
    ];

    const empates = detectarEmpatesRelevantes(tablaDe(jugados), jugados, 2);

    expect(empates).toHaveLength(1);
    expect(empates[0]).toMatchObject({ desdePosicion: 2, hastaPosicion: 4 });
    expect(empates[0]?.equipos).toHaveLength(3);
  });

  it('ignora un empate que queda entero fuera de la línea de corte', () => {
    const jugados = dosGanadoresYDosPerdedores;

    // Con corte 1 solo importa el empate del 1.° puesto; Beta y Delta (3.° y 4.°) quedan afuera.
    const empates = detectarEmpatesRelevantes(tablaDe(jugados), jugados, 1);

    expect(empates).toHaveLength(1);
    expect(empates[0]).toMatchObject({ desdePosicion: 1, hastaPosicion: 2 });
  });

  it('ignora un empate que arranca justo después del corte', () => {
    const jugados = [
      partido(ALFA, BETA, 1, 0, ALFA),
      partido(ALFA, GAMA, 1, 0, ALFA),
      partido(ALFA, DELTA, 1, 0, ALFA),
    ];

    expect(detectarEmpatesRelevantes(tablaDe(jugados), jugados, 1)).toEqual([]);
  });

  it('da por resuelto un empate cuando el organizador les dio ventajas distintas', () => {
    const jugados = dosGanadoresYDosPerdedores;
    const conVentaja = [
      equipo(ALFA, 'Alfa', { ventajaDesempate: 1 }),
      ...equipos.slice(1),
    ];

    const tabla = tablaDe(jugados, conVentaja);

    expect(detectarEmpatesRelevantes(tabla, jugados, 2)).toEqual([]);
  });

  it('sigue marcando como empate a los que tienen la misma ventaja', () => {
    const jugados = dosGanadoresYDosPerdedores;
    const conVentaja = [
      equipo(ALFA, 'Alfa', { ventajaDesempate: 1 }),
      equipo(BETA, 'Beta'),
      equipo(GAMA, 'Gama', { ventajaDesempate: 1 }),
      equipo(DELTA, 'Delta'),
    ];

    const empates = detectarEmpatesRelevantes(
      tablaDe(jugados, conVentaja),
      jugados,
      2
    );

    expect(empates).toHaveLength(1);
    expect(empates[0]?.equipos.map((f) => f.equipoId)).toEqual([ALFA, GAMA]);
  });

  it('incluye el resultado entre los empatados y deja afuera el resto de los partidos', () => {
    // Alfa y Gama empatan entre sí (1 punto cada uno) y ganan o pierden contra otros.
    const entreSi = partido(ALFA, GAMA, 2, 2, null);
    const jugados = [entreSi, partido(BETA, DELTA, 1, 0, BETA)];

    const empates = detectarEmpatesRelevantes(tablaDe(jugados), jugados, 2);

    // Beta tiene 3 puntos; Alfa y Gama quedan 1 punto cada uno, empatados 2.° y 3.°.
    expect(empates).toHaveLength(1);
    expect(empates[0]).toMatchObject({ desdePosicion: 2, hastaPosicion: 3 });
    expect(empates[0]?.directos).toEqual([entreSi]);
  });

  it('trae a favor, en contra y diferencia de cada empatado para compararlos', () => {
    const jugados = [
      partido(ALFA, BETA, 3, 0, ALFA),
      partido(GAMA, DELTA, 1, 0, GAMA),
    ];

    const [empate] = detectarEmpatesRelevantes(tablaDe(jugados), jugados, 2);
    const alfa = empate?.equipos.find((f) => f.equipoId === ALFA);
    const gama = empate?.equipos.find((f) => f.equipoId === GAMA);

    expect(alfa).toMatchObject({ aFavor: 3, enContra: 0, diferencia: 3 });
    expect(gama).toMatchObject({ aFavor: 1, enContra: 0, diferencia: 1 });
  });

  it('separa los empates por grupo, con los puestos de cada grupo', () => {
    const conGrupos = [
      equipo(ALFA, 'Alfa', { grupo: 1 }),
      equipo(BETA, 'Beta', { grupo: 1 }),
      equipo(GAMA, 'Gama', { grupo: 2 }),
      equipo(DELTA, 'Delta', { grupo: 2 }),
    ];
    // Grupo 1: gana Alfa (sin empate). Grupo 2: empatan Gama y Delta.
    const jugados = [
      partido(ALFA, BETA, 1, 0, ALFA),
      partido(GAMA, DELTA, 1, 1, null),
    ];

    const empates = detectarEmpatesRelevantes(
      tablaDe(jugados, conGrupos),
      jugados,
      1
    );

    expect(empates).toHaveLength(1);
    expect(empates[0]).toMatchObject({
      grupo: 2,
      desdePosicion: 1,
      hastaPosicion: 2,
    });
  });

  it('con la fase sin jugar todos están empatados', () => {
    const empates = detectarEmpatesRelevantes(tablaDe([]), [], 1);

    expect(empates).toHaveLength(1);
    expect(empates[0]).toMatchObject({ desdePosicion: 1, hastaPosicion: 4 });
  });
});

describe('obtenerEmpates', () => {
  it('usa la línea de corte de la fase', async () => {
    fasesMock.mockResolvedValue([fase(3, { lineaDeCorte: 2 })]);
    jugadosMock.mockResolvedValue([
      partido(ALFA, BETA, 1, 0, ALFA),
      partido(GAMA, DELTA, 1, 0, GAMA),
    ]);

    const resultado = await obtenerEmpates(TORNEO_ID, USUARIO_ID, 3);

    expect(resultado.faseId).toBe(3);
    expect(resultado.lineaDeCorte).toBe(2);
    expect(resultado.empates).toHaveLength(1);
    expect(jugadosMock).toHaveBeenCalledWith(3);
  });

  it('sin línea de corte usa la de por defecto: solo importa el 1.° puesto', async () => {
    jugadosMock.mockResolvedValue([
      partido(ALFA, BETA, 1, 0, ALFA),
      partido(GAMA, DELTA, 1, 0, GAMA),
    ]);

    const resultado = await obtenerEmpates(TORNEO_ID, USUARIO_ID, 3);

    expect(resultado.lineaDeCorte).toBe(LINEA_DE_CORTE_POR_DEFECTO);
    // Empate del 1.° (Alfa y Gama): relevante. El de Beta y Delta (3.° y 4.°): se ignora.
    expect(resultado.empates).toHaveLength(1);
    expect(resultado.empates[0]).toMatchObject({ desdePosicion: 1 });
  });

  it('devuelve la lista vacía si no hay empates relevantes', async () => {
    jugadosMock.mockResolvedValue([
      partido(ALFA, BETA, 1, 0, ALFA),
      partido(ALFA, GAMA, 1, 0, ALFA),
      partido(ALFA, DELTA, 1, 0, ALFA),
    ]);

    const resultado = await obtenerEmpates(TORNEO_ID, USUARIO_ID, 3);

    expect(resultado.empates).toEqual([]);
  });

  it('responde 409 en una fase de eliminación y no busca partidos', async () => {
    fasesMock.mockResolvedValue([fase(3, { tipo: 'eliminacion' })]);

    await expect(
      obtenerEmpates(TORNEO_ID, USUARIO_ID, 3)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(jugadosMock).not.toHaveBeenCalled();
  });

  it('responde 404 si la fase no es del torneo', async () => {
    await expect(
      obtenerEmpates(TORNEO_ID, USUARIO_ID, 99)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(jugadosMock).not.toHaveBeenCalled();
  });

  it('propaga el 404 si el torneo no es del organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    await expect(
      obtenerEmpates(TORNEO_ID, USUARIO_ID, 3)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(fasesMock).not.toHaveBeenCalled();
  });
});
