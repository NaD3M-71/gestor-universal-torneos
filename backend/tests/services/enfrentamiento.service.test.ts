import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as enfrentamientoRepository from '@repositories/enfrentamiento.repository';
import * as posicionRepository from '@repositories/posicion.repository';
import {
  cargarResultado,
  listarEnfrentamientos,
  validarDatosResultado,
} from '@services/enfrentamiento.service';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../../src/middlewares/errors/AppError';
import type { ErrorValidacion } from '../../src/middlewares/errors/ErrorValidacion';
import type { FasePublica } from '../../src/types/fase';
import type {
  DatosResultado,
  EnfrentamientoConFase,
  EnfrentamientoDeLista,
} from '../../src/types/enfrentamiento';
import type { TorneoPublico } from '../../src/types/torneo';

// Se reemplazan el repositorio (sin base de datos) y la búsqueda de torneos,
// que ya tiene sus propios tests.
vi.mock('@repositories/enfrentamiento.repository', () => ({
  buscarEnfrentamientoConFase: vi.fn(),
  guardarResultado: vi.fn(),
  buscarSiguiente: vi.fn(),
  guardarResultadoConPromocion: vi.fn(),
  buscarSiguienteDeSerie: vi.fn(),
  guardarResultadoConPromocionDeSerie: vi.fn(),
  listarEnfrentamientosDeFase: vi.fn(),
}));
vi.mock('@repositories/posicion.repository', () => ({
  listarFasesDeTorneo: vi.fn(),
}));
vi.mock('@services/torneo.service', () => ({
  obtenerTorneo: vi.fn(),
}));

const buscarMock = vi.mocked(
  enfrentamientoRepository.buscarEnfrentamientoConFase
);
const guardarMock = vi.mocked(enfrentamientoRepository.guardarResultado);
const buscarSiguienteMock = vi.mocked(enfrentamientoRepository.buscarSiguiente);
const guardarConPromocionMock = vi.mocked(
  enfrentamientoRepository.guardarResultadoConPromocion
);
const buscarSiguienteDeSerieMock = vi.mocked(
  enfrentamientoRepository.buscarSiguienteDeSerie
);
const guardarConPromocionDeSerieMock = vi.mocked(
  enfrentamientoRepository.guardarResultadoConPromocionDeSerie
);
const listarDeFaseMock = vi.mocked(
  enfrentamientoRepository.listarEnfrentamientosDeFase
);
const fasesMock = vi.mocked(posicionRepository.listarFasesDeTorneo);
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
  siguienteId: null,
  vueltaDeId: null,
  tieneVuelta: false,
  fase: {
    id: 3,
    torneoId: TORNEO_ID,
    tipo: 'liga',
    estado: 'activa',
    idaYVuelta: false,
  },
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
  guardarConPromocionMock.mockImplementation(async (id, resultado) => ({
    ...enfrentamiento,
    ...resultado,
    id,
  }));
});

describe('validarDatosResultado', () => {
  it.each([
    ['un ganador', { ganadorId: EQUIPO_A }],
    ['un empate', { empate: true }],
    [
      'un ganador con marcador',
      { ganadorId: EQUIPO_A, resultadoA: 2, resultadoB: 1 },
    ],
    ['un empate con marcador', { empate: true, resultadoA: 1, resultadoB: 1 }],
    [
      'solo el marcador (la ida de una serie)',
      { resultadoA: 2, resultadoB: 1 },
    ],
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
      comentario: null,
    });
    expect(resultado.ganadorId).toBe(EQUIPO_A);
  });

  it('guarda un ganador con su marcador', async () => {
    await cargar({ ganadorId: EQUIPO_B, resultadoA: 1, resultadoB: 3 });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: EQUIPO_B,
      resultadoA: 1,
      resultadoB: 3,
      comentario: null,
    });
  });

  it('respeta al ganador aunque tenga el marcador menor', async () => {
    await cargar({ ganadorId: EQUIPO_A, resultadoA: 68, resultadoB: 72 });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: EQUIPO_A,
      resultadoA: 68,
      resultadoB: 72,
      comentario: null,
    });
  });

  it('guarda un empate sin marcador como 0-0, sin ganador', async () => {
    await cargar({ empate: true });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: null,
      resultadoA: 0,
      resultadoB: 0,
      comentario: null,
    });
  });

  it('guarda un empate con el marcador que se informe', async () => {
    await cargar({ empate: true, resultadoA: 2, resultadoB: 2 });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: null,
      resultadoA: 2,
      resultadoB: 2,
      comentario: null,
    });
  });

  it('guarda el comentario junto con el resultado', async () => {
    await cargar({
      ganadorId: EQUIPO_A,
      resultadoA: 1,
      resultadoB: 1,
      comentario: 'Ganó por penales',
    });

    expect(guardarMock).toHaveBeenCalledWith(
      ENFRENTAMIENTO_ID,
      expect.objectContaining({ comentario: 'Ganó por penales' })
    );
  });

  it('recorta el comentario y guarda null si queda vacío', async () => {
    await cargar({ ganadorId: EQUIPO_A, comentario: '  Ganó por penales  ' });
    await cargar({ ganadorId: EQUIPO_A, comentario: '   ' });

    expect(guardarMock).toHaveBeenNthCalledWith(
      1,
      ENFRENTAMIENTO_ID,
      expect.objectContaining({ comentario: 'Ganó por penales' })
    );
    expect(guardarMock).toHaveBeenNthCalledWith(
      2,
      ENFRENTAMIENTO_ID,
      expect.objectContaining({ comentario: null })
    );
  });

  it('permite corregir: volver a cargar sobrescribe el resultado anterior', async () => {
    await cargar({ ganadorId: EQUIPO_A, resultadoA: 2, resultadoB: 0 });
    await cargar({ empate: true });

    expect(guardarMock).toHaveBeenCalledTimes(2);
    expect(guardarMock).toHaveBeenLastCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: null,
      resultadoA: 0,
      resultadoB: 0,
      comentario: null,
    });
  });

  it('responde 400 con solo el marcador: fuera de la ida de una serie hay que elegir ganador o empate', async () => {
    await expect(
      cargar({ resultadoA: 2, resultadoB: 1 })
    ).rejects.toMatchObject({
      detalles: [expect.objectContaining({ campo: 'ganadorId' })],
    });
    expect(guardarMock).not.toHaveBeenCalled();
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

describe('cargarResultado en una fase de eliminación', () => {
  const SIGUIENTE_ID = 2;
  const OTRO_ALIMENTADOR_ID = 6;

  const partidoDeEliminacion: EnfrentamientoConFase = {
    ...enfrentamiento,
    instancia: 'cuartos',
    siguienteId: SIGUIENTE_ID,
    fase: {
      id: 3,
      torneoId: TORNEO_ID,
      tipo: 'eliminacion',
      estado: 'activa',
      idaYVuelta: false,
    },
  };

  beforeEach(() => {
    buscarMock.mockResolvedValue(partidoDeEliminacion);
    // El partido 5 es el de mayor id de los dos que alimentan al siguiente.
    buscarSiguienteMock.mockResolvedValue({
      id: SIGUIENTE_ID,
      ganadorId: null,
      alimentadoresIds: [OTRO_ALIMENTADOR_ID - 2, ENFRENTAMIENTO_ID],
    });
  });

  it('guarda el ganador y lo promueve al partido siguiente en la misma operación', async () => {
    await cargar({ ganadorId: EQUIPO_A });

    expect(guardarConPromocionMock).toHaveBeenCalledWith(
      ENFRENTAMIENTO_ID,
      {
        ganadorId: EQUIPO_A,
        resultadoA: null,
        resultadoB: null,
        comentario: null,
      },
      { siguienteId: SIGUIENTE_ID, lado: 'B', equipoId: EQUIPO_A }
    );
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('el partido de menor id de los dos que alimentan al siguiente entra como equipo A', async () => {
    buscarSiguienteMock.mockResolvedValue({
      id: SIGUIENTE_ID,
      ganadorId: null,
      alimentadoresIds: [ENFRENTAMIENTO_ID, OTRO_ALIMENTADOR_ID],
    });

    await cargar({ ganadorId: EQUIPO_B });

    expect(guardarConPromocionMock).toHaveBeenCalledWith(
      ENFRENTAMIENTO_ID,
      expect.anything(),
      { siguienteId: SIGUIENTE_ID, lado: 'A', equipoId: EQUIPO_B }
    );
  });

  it('acepta un marcador informativo junto al ganador', async () => {
    await cargar({ ganadorId: EQUIPO_A, resultadoA: 3, resultadoB: 1 });

    expect(guardarConPromocionMock).toHaveBeenCalledWith(
      ENFRENTAMIENTO_ID,
      {
        ganadorId: EQUIPO_A,
        resultadoA: 3,
        resultadoB: 1,
        comentario: null,
      },
      expect.anything()
    );
  });

  it('guarda el comentario junto con el ganador y la promoción (ej. definido por penales)', async () => {
    await cargar({
      ganadorId: EQUIPO_A,
      resultadoA: 1,
      resultadoB: 1,
      comentario: 'Ganó por penales',
    });

    expect(guardarConPromocionMock).toHaveBeenCalledWith(
      ENFRENTAMIENTO_ID,
      {
        ganadorId: EQUIPO_A,
        resultadoA: 1,
        resultadoB: 1,
        comentario: 'Ganó por penales',
      },
      expect.objectContaining({ siguienteId: SIGUIENTE_ID })
    );
  });

  it('en la final guarda el resultado sin promover a nadie', async () => {
    buscarMock.mockResolvedValue({
      ...partidoDeEliminacion,
      instancia: 'final',
      siguienteId: null,
    });

    await cargar({ ganadorId: EQUIPO_A });

    expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
      ganadorId: EQUIPO_A,
      resultadoA: null,
      resultadoB: null,
      comentario: null,
    });
    expect(buscarSiguienteMock).not.toHaveBeenCalled();
    expect(guardarConPromocionMock).not.toHaveBeenCalled();
  });

  it.each(['futbol_clasico', 'sistema_alternativo', 'ganada_perdida'] as const)(
    'responde 409 con un empate aunque el sistema sea %s',
    async (sistemaPuntuacion) => {
      obtenerTorneoMock.mockResolvedValue({
        ...torneoEnCurso,
        sistemaPuntuacion,
      });

      await expect(cargar({ empate: true })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(guardarMock).not.toHaveBeenCalled();
      expect(guardarConPromocionMock).not.toHaveBeenCalled();
    }
  );

  it('responde 400 si el ganador no es uno de los dos equipos del partido', async () => {
    await expect(cargar({ ganadorId: 999 })).rejects.toMatchObject({
      detalles: [expect.objectContaining({ campo: 'ganadorId' })],
    });
    expect(guardarConPromocionMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el partido todavía no tiene sus dos equipos (por ejemplo un bye)', async () => {
    buscarMock.mockResolvedValue({
      ...partidoDeEliminacion,
      equipoBId: null,
    });

    await expect(cargar({ ganadorId: EQUIPO_A })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(guardarConPromocionMock).not.toHaveBeenCalled();
  });

  it('responde 400 con solo el marcador: en una eliminatoria de partido único el ganador es obligatorio', async () => {
    await expect(
      cargar({ resultadoA: 2, resultadoB: 1 })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(guardarMock).not.toHaveBeenCalled();
    expect(guardarConPromocionMock).not.toHaveBeenCalled();
  });

  describe('corrección de un ganador ya cargado', () => {
    const yaCargado: EnfrentamientoConFase = {
      ...partidoDeEliminacion,
      ganadorId: EQUIPO_A,
      resultadoA: 2,
      resultadoB: 1,
    };

    beforeEach(() => {
      buscarMock.mockResolvedValue(yaCargado);
    });

    it('cambia al ganador y reemplaza al equipo promovido si el siguiente todavía no se jugó', async () => {
      await cargar({ ganadorId: EQUIPO_B });

      expect(guardarConPromocionMock).toHaveBeenCalledWith(
        ENFRENTAMIENTO_ID,
        expect.objectContaining({ ganadorId: EQUIPO_B }),
        { siguienteId: SIGUIENTE_ID, lado: 'B', equipoId: EQUIPO_B }
      );
    });

    it('responde 409 si el partido siguiente ya tiene resultado', async () => {
      buscarSiguienteMock.mockResolvedValue({
        id: SIGUIENTE_ID,
        ganadorId: EQUIPO_A,
        alimentadoresIds: [OTRO_ALIMENTADOR_ID, ENFRENTAMIENTO_ID],
      });

      await expect(cargar({ ganadorId: EQUIPO_B })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(guardarConPromocionMock).not.toHaveBeenCalled();
      expect(guardarMock).not.toHaveBeenCalled();
    });

    it('si el ganador es el mismo, solo corrige el marcador aunque el siguiente ya se haya jugado', async () => {
      buscarSiguienteMock.mockResolvedValue({
        id: SIGUIENTE_ID,
        ganadorId: EQUIPO_A,
        alimentadoresIds: [OTRO_ALIMENTADOR_ID, ENFRENTAMIENTO_ID],
      });

      await cargar({ ganadorId: EQUIPO_A, resultadoA: 3, resultadoB: 0 });

      expect(guardarMock).toHaveBeenCalledWith(ENFRENTAMIENTO_ID, {
        ganadorId: EQUIPO_A,
        resultadoA: 3,
        resultadoB: 0,
        comentario: null,
      });
      expect(buscarSiguienteMock).not.toHaveBeenCalled();
      expect(guardarConPromocionMock).not.toHaveBeenCalled();
    });
  });
});

describe('cargarResultado en una eliminatoria a ida y vuelta', () => {
  const IDA_ID = 5;
  const VUELTA_ID = 6;
  const SIGUIENTE_IDA_ID = 20;
  const SIGUIENTE_VUELTA_ID = 21;
  const OTRO_ALIMENTADOR_ID = 8;

  const faseDoble = {
    id: 3,
    torneoId: TORNEO_ID,
    tipo: 'eliminacion',
    estado: 'activa',
    idaYVuelta: true,
  };

  // En la vuelta los lados vienen invertidos respecto de la ida.
  const ida: EnfrentamientoConFase = {
    ...enfrentamiento,
    id: IDA_ID,
    instancia: 'semifinal_ida',
    tieneVuelta: true,
    fase: faseDoble,
  };
  const vuelta: EnfrentamientoConFase = {
    ...enfrentamiento,
    id: VUELTA_ID,
    equipoAId: EQUIPO_B,
    equipoBId: EQUIPO_A,
    instancia: 'semifinal_vuelta',
    siguienteId: SIGUIENTE_IDA_ID,
    vueltaDeId: IDA_ID,
    fase: faseDoble,
  };

  const cargarEn = (id: number, datos: DatosResultado) =>
    cargarResultado(TORNEO_ID, id, USUARIO_ID, datos);

  beforeEach(() => {
    buscarMock.mockImplementation(async (id) => (id === IDA_ID ? ida : vuelta));
    buscarSiguienteDeSerieMock.mockResolvedValue({
      idaId: SIGUIENTE_IDA_ID,
      vueltaId: SIGUIENTE_VUELTA_ID,
      alimentadoresIds: [OTRO_ALIMENTADOR_ID, VUELTA_ID],
      jugado: false,
    });
    guardarConPromocionDeSerieMock.mockImplementation(
      async (id, resultado) => ({ ...enfrentamiento, ...resultado, id })
    );
  });

  describe('la ida', () => {
    it('guarda solo el marcador, sin ganador, y no promueve a nadie', async () => {
      await cargarEn(IDA_ID, { resultadoA: 2, resultadoB: 1 });

      expect(guardarMock).toHaveBeenCalledWith(IDA_ID, {
        ganadorId: null,
        resultadoA: 2,
        resultadoB: 1,
        comentario: null,
      });
      expect(buscarSiguienteDeSerieMock).not.toHaveBeenCalled();
      expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
    });

    it('guarda el comentario junto con el marcador', async () => {
      await cargarEn(IDA_ID, {
        resultadoA: 0,
        resultadoB: 0,
        comentario: 'Se suspendió por lluvia',
      });

      expect(guardarMock).toHaveBeenCalledWith(
        IDA_ID,
        expect.objectContaining({ comentario: 'Se suspendió por lluvia' })
      );
    });

    it('volver a cargar sobrescribe el marcador anterior', async () => {
      await cargarEn(IDA_ID, { resultadoA: 2, resultadoB: 1 });
      await cargarEn(IDA_ID, { resultadoA: 3, resultadoB: 1 });

      expect(guardarMock).toHaveBeenLastCalledWith(
        IDA_ID,
        expect.objectContaining({ resultadoA: 3, resultadoB: 1 })
      );
    });

    it.each([
      ['un ganador', { ganadorId: EQUIPO_A, resultadoA: 2, resultadoB: 1 }],
      ['un empate', { empate: true }],
    ] as [string, DatosResultado][])(
      'responde 400 si se envía %s: quien avanza se indica en la vuelta',
      async (_, datos) => {
        await expect(cargarEn(IDA_ID, datos)).rejects.toMatchObject({
          statusCode: 400,
          detalles: [expect.objectContaining({ campo: 'ganadorId' })],
        });
        expect(guardarMock).not.toHaveBeenCalled();
      }
    );

    it('responde 400 si no trae el marcador', async () => {
      await expect(cargarEn(IDA_ID, {})).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(guardarMock).not.toHaveBeenCalled();
    });

    it('responde 409 si todavía no tiene definidos sus dos equipos', async () => {
      buscarMock.mockResolvedValue({ ...ida, equipoAId: null });

      await expect(
        cargarEn(IDA_ID, { resultadoA: 1, resultadoB: 0 })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(guardarMock).not.toHaveBeenCalled();
    });
  });

  describe('la vuelta', () => {
    it('guarda quien avanza y lo promueve a la ida y a la vuelta del cruce siguiente', async () => {
      await cargarEn(VUELTA_ID, { ganadorId: EQUIPO_A });

      expect(buscarSiguienteDeSerieMock).toHaveBeenCalledWith(SIGUIENTE_IDA_ID);
      expect(guardarConPromocionDeSerieMock).toHaveBeenCalledWith(
        VUELTA_ID,
        {
          ganadorId: EQUIPO_A,
          resultadoA: null,
          resultadoB: null,
          comentario: null,
        },
        {
          idaId: SIGUIENTE_IDA_ID,
          vueltaId: SIGUIENTE_VUELTA_ID,
          lado: 'B',
          equipoId: EQUIPO_A,
        }
      );
      expect(guardarMock).not.toHaveBeenCalled();
    });

    it('la vuelta de menor id de las dos que alimentan al cruce siguiente entra como equipo A', async () => {
      buscarSiguienteDeSerieMock.mockResolvedValue({
        idaId: SIGUIENTE_IDA_ID,
        vueltaId: SIGUIENTE_VUELTA_ID,
        alimentadoresIds: [VUELTA_ID, OTRO_ALIMENTADOR_ID],
        jugado: false,
      });

      await cargarEn(VUELTA_ID, { ganadorId: EQUIPO_B });

      expect(guardarConPromocionDeSerieMock).toHaveBeenCalledWith(
        VUELTA_ID,
        expect.anything(),
        expect.objectContaining({ lado: 'A', equipoId: EQUIPO_B })
      );
    });

    it('respeta al organizador aunque el marcador diga otra cosa, y guarda el comentario', async () => {
      // La vuelta la juegan B (local) y A: el organizador marca a A.
      await cargarEn(VUELTA_ID, {
        ganadorId: EQUIPO_A,
        resultadoA: 3,
        resultadoB: 1,
        comentario: 'Pasa A: en este juego gana el que menos puntos hace',
      });

      expect(guardarConPromocionDeSerieMock).toHaveBeenCalledWith(
        VUELTA_ID,
        {
          ganadorId: EQUIPO_A,
          resultadoA: 3,
          resultadoB: 1,
          comentario: 'Pasa A: en este juego gana el que menos puntos hace',
        },
        expect.anything()
      );
    });

    it('no exige que la ida tenga marcador (final a partido único)', async () => {
      await expect(
        cargarEn(VUELTA_ID, { ganadorId: EQUIPO_A })
      ).resolves.toBeDefined();

      expect(buscarMock).toHaveBeenCalledTimes(1);
      expect(buscarMock).toHaveBeenCalledWith(VUELTA_ID);
    });

    it('en la final guarda el resultado sin promover a nadie', async () => {
      buscarMock.mockResolvedValue({ ...vuelta, siguienteId: null });

      await cargarEn(VUELTA_ID, { ganadorId: EQUIPO_A });

      expect(guardarMock).toHaveBeenCalledWith(
        VUELTA_ID,
        expect.objectContaining({ ganadorId: EQUIPO_A })
      );
      expect(buscarSiguienteDeSerieMock).not.toHaveBeenCalled();
      expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
    });

    it('responde 400 si el ganador no es uno de los dos equipos', async () => {
      await expect(
        cargarEn(VUELTA_ID, { ganadorId: 999 })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
    });

    it('responde 400 con solo el marcador: en la vuelta hay que indicar quien avanza', async () => {
      await expect(
        cargarEn(VUELTA_ID, { resultadoA: 1, resultadoB: 0 })
      ).rejects.toMatchObject({
        statusCode: 400,
        detalles: [expect.objectContaining({ campo: 'ganadorId' })],
      });
      expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
    });

    it('responde 409 con un empate: en una eliminatoria siempre avanza alguien', async () => {
      await expect(cargarEn(VUELTA_ID, { empate: true })).rejects.toMatchObject(
        { statusCode: 409 }
      );
      expect(guardarMock).not.toHaveBeenCalled();
      expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
    });

    it('responde 500 si no encuentra el cruce siguiente', async () => {
      buscarSiguienteDeSerieMock.mockResolvedValue(null);

      await expect(
        cargarEn(VUELTA_ID, { ganadorId: EQUIPO_A })
      ).rejects.toMatchObject({ statusCode: 500 });
      expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
    });

    describe('corrección de quien avanza', () => {
      beforeEach(() => {
        buscarMock.mockResolvedValue({
          ...vuelta,
          ganadorId: EQUIPO_A,
          resultadoA: 1,
          resultadoB: 0,
        });
      });

      it('cambia quien avanza y reemplaza al equipo promovido si el cruce siguiente no se jugó', async () => {
        await cargarEn(VUELTA_ID, { ganadorId: EQUIPO_B });

        expect(guardarConPromocionDeSerieMock).toHaveBeenCalledWith(
          VUELTA_ID,
          expect.objectContaining({ ganadorId: EQUIPO_B }),
          {
            idaId: SIGUIENTE_IDA_ID,
            vueltaId: SIGUIENTE_VUELTA_ID,
            lado: 'B',
            equipoId: EQUIPO_B,
          }
        );
      });

      it('responde 409 si el cruce siguiente ya tiene resultado', async () => {
        buscarSiguienteDeSerieMock.mockResolvedValue({
          idaId: SIGUIENTE_IDA_ID,
          vueltaId: SIGUIENTE_VUELTA_ID,
          alimentadoresIds: [OTRO_ALIMENTADOR_ID, VUELTA_ID],
          jugado: true,
        });

        await expect(
          cargarEn(VUELTA_ID, { ganadorId: EQUIPO_B })
        ).rejects.toMatchObject({ statusCode: 409 });
        expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
        expect(guardarMock).not.toHaveBeenCalled();
      });

      it('si quien avanza es el mismo, solo corrige el marcador aunque el cruce siguiente ya se haya jugado', async () => {
        buscarSiguienteDeSerieMock.mockResolvedValue({
          idaId: SIGUIENTE_IDA_ID,
          vueltaId: SIGUIENTE_VUELTA_ID,
          alimentadoresIds: [OTRO_ALIMENTADOR_ID, VUELTA_ID],
          jugado: true,
        });

        await cargarEn(VUELTA_ID, {
          ganadorId: EQUIPO_A,
          resultadoA: 2,
          resultadoB: 0,
        });

        expect(guardarMock).toHaveBeenCalledWith(
          VUELTA_ID,
          expect.objectContaining({ resultadoA: 2, resultadoB: 0 })
        );
        expect(buscarSiguienteDeSerieMock).not.toHaveBeenCalled();
        expect(guardarConPromocionDeSerieMock).not.toHaveBeenCalled();
      });
    });
  });
});

describe('listarEnfrentamientos', () => {
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

  const partidoDeLista = (id: number): EnfrentamientoDeLista => ({
    id,
    faseId: 3,
    instancia: 'fecha_1',
    equipoA: { id: EQUIPO_A, nombre: 'Alfa' },
    equipoB: { id: EQUIPO_B, nombre: 'Beta' },
    resultadoA: null,
    resultadoB: null,
    ganadorId: null,
    comentario: null,
  });

  beforeEach(() => {
    fasesMock.mockResolvedValue([fase(3)]);
    listarDeFaseMock.mockResolvedValue([partidoDeLista(1), partidoDeLista(2)]);
  });

  it('lista los enfrentamientos de la fase activa', async () => {
    const listado = await listarEnfrentamientos(TORNEO_ID, USUARIO_ID);

    expect(listado.faseId).toBe(3);
    expect(listado.enfrentamientos.map((e) => e.id)).toEqual([1, 2]);
    expect(obtenerTorneoMock).toHaveBeenCalledWith(TORNEO_ID, USUARIO_ID);
    expect(listarDeFaseMock).toHaveBeenCalledWith(3, undefined);
  });

  it('usa la fase pedida por faseId', async () => {
    fasesMock.mockResolvedValue([fase(4, { orden: 2 }), fase(3)]);

    const listado = await listarEnfrentamientos(TORNEO_ID, USUARIO_ID, 3);

    expect(listado.faseId).toBe(3);
    expect(listarDeFaseMock).toHaveBeenCalledWith(3, undefined);
  });

  it('sin faseId y sin fase activa usa la última fase', async () => {
    fasesMock.mockResolvedValue([
      fase(4, { orden: 2, estado: 'cerrada' }),
      fase(3, { estado: 'cerrada' }),
    ]);

    const listado = await listarEnfrentamientos(TORNEO_ID, USUARIO_ID);

    expect(listado.faseId).toBe(4);
  });

  it('filtra por instancia', async () => {
    await listarEnfrentamientos(TORNEO_ID, USUARIO_ID, undefined, 'fecha_3');

    expect(listarDeFaseMock).toHaveBeenCalledWith(3, 'fecha_3');
  });

  it('devuelve una lista vacía si la instancia no existe', async () => {
    listarDeFaseMock.mockResolvedValue([]);

    const listado = await listarEnfrentamientos(
      TORNEO_ID,
      USUARIO_ID,
      undefined,
      'fecha_99'
    );

    expect(listado.enfrentamientos).toEqual([]);
  });

  it('responde 404 si la fase no es del torneo', async () => {
    await expect(
      listarEnfrentamientos(TORNEO_ID, USUARIO_ID, 99)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(listarDeFaseMock).not.toHaveBeenCalled();
  });

  it('responde 409 si el torneo todavía no tiene fases', async () => {
    fasesMock.mockResolvedValue([]);

    await expect(
      listarEnfrentamientos(TORNEO_ID, USUARIO_ID)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('propaga el 404 si el torneo no es del organizador', async () => {
    obtenerTorneoMock.mockRejectedValue(
      new AppError('Torneo no encontrado.', 404)
    );

    await expect(
      listarEnfrentamientos(TORNEO_ID, USUARIO_ID)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(fasesMock).not.toHaveBeenCalled();
  });
});
