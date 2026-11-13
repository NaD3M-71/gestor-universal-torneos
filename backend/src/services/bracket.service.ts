import * as bracketRepository from '@repositories/bracket.repository';
import * as posicionRepository from '@repositories/posicion.repository';
import { elegirFase } from '@services/posicion.service';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../middlewares/errors/AppError';
import type {
  BracketTorneo,
  CruceIdaYVuelta,
  EnfrentamientoDeBracket,
  PartidoBracketPublico,
  RondaBracket,
  RondaIdaYVuelta,
} from '../types/bracket';

const TIPO_FASE_ELIMINACION = 'eliminacion';

/**
 * Agrupa los enfrentamientos de una fase de eliminación en rondas, de la
 * primera a la final. La ronda de cada partido sale de su distancia a la
 * final siguiendo siguienteId (la final es el único partido sin siguiente).
 *
 * El lado en el que entra el ganador al partido siguiente se deduce del
 * orden de id: de los dos partidos que alimentan a uno, el de menor id entra
 * como equipo A y el de mayor id como B (así los guarda la creación del cuadro).
 */
export const armarRondas = (
  enfrentamientos: EnfrentamientoDeBracket[]
): RondaBracket[] => {
  if (enfrentamientos.length === 0) {
    return [];
  }

  const ordenados = [...enfrentamientos].sort((a, b) => a.id - b.id);
  const porId = new Map(ordenados.map((partido) => [partido.id, partido]));

  // Saltos hasta la final. El tope evita un bucle si los datos tuvieran un ciclo.
  const distanciaAFinal = (partido: EnfrentamientoDeBracket): number => {
    let distancia = 0;
    let actual = partido;
    while (actual.siguienteId !== null && distancia < ordenados.length) {
      const siguiente = porId.get(actual.siguienteId);
      if (siguiente === undefined) {
        break;
      }
      actual = siguiente;
      distancia += 1;
    }
    return distancia;
  };

  const distancias = new Map(
    ordenados.map((partido) => [partido.id, distanciaAFinal(partido)])
  );
  const cantidadRondas = Math.max(...distancias.values()) + 1;

  // Los ids vienen en orden: el primero que alimenta a un partido es el A.
  const ladoPorId = new Map<number, 'A' | 'B'>();
  const yaTieneA = new Set<number>();
  ordenados.forEach((partido) => {
    if (partido.siguienteId === null) {
      return;
    }
    if (yaTieneA.has(partido.siguienteId)) {
      ladoPorId.set(partido.id, 'B');
    } else {
      yaTieneA.add(partido.siguienteId);
      ladoPorId.set(partido.id, 'A');
    }
  });

  return Array.from({ length: cantidadRondas }, (_, indice) => {
    const ronda = indice + 1;
    const delaRonda = ordenados.filter(
      (partido) => cantidadRondas - (distancias.get(partido.id) ?? 0) === ronda
    );

    return {
      ronda,
      instancia: delaRonda[0]?.instancia ?? `ronda_${ronda}`,
      partidos: delaRonda.map((partido, posicion) => ({
        id: partido.id,
        numeroEnRonda: posicion + 1,
        equipoA: partido.equipoA,
        equipoB: partido.equipoB,
        resultadoA: partido.resultadoA,
        resultadoB: partido.resultadoB,
        ganadorId: partido.ganadorId,
        siguienteId: partido.siguienteId,
        ladoSiguiente: ladoPorId.get(partido.id) ?? null,
        esBye: ronda === 1 && partido.equipoB === null,
      })),
    };
  });
};

/** Un cruce a ida y vuelta tal como sale de la base: su ida (o bye) y su vuelta. */
interface CruceDeBase {
  ida: EnfrentamientoDeBracket;
  vuelta: EnfrentamientoDeBracket | null;
}

/**
 * Agrupa los enfrentamientos de una fase de eliminación a ida y vuelta en
 * rondas de cruces, de la primera a la final. Cada vuelta apunta a su ida con
 * vueltaDeId; un partido sin vuelta es un bye. Quien salta al cruce siguiente
 * es la vuelta (o el bye), y apunta a la ida del cruce siguiente: la ronda de
 * cada cruce sale de su distancia a la final siguiendo ese siguienteId.
 *
 * El lado en el que entra quien avanza se deduce como en armarRondas: de los
 * dos que alimentan a un cruce, el de menor id entra como equipo A de la ida.
 */
export const armarRondasIdaYVuelta = (
  enfrentamientos: EnfrentamientoDeBracket[]
): RondaIdaYVuelta[] => {
  if (enfrentamientos.length === 0) {
    return [];
  }

  const ordenados = [...enfrentamientos].sort((a, b) => a.id - b.id);
  const vueltaDeIda = new Map<number, EnfrentamientoDeBracket>();
  ordenados.forEach((partido) => {
    if (partido.vueltaDeId !== null) {
      vueltaDeIda.set(partido.vueltaDeId, partido);
    }
  });

  const cruces: CruceDeBase[] = ordenados
    .filter((partido) => partido.vueltaDeId === null)
    .map((ida) => ({ ida, vuelta: vueltaDeIda.get(ida.id) ?? null }));
  const cruceDeIda = new Map(cruces.map((cruce) => [cruce.ida.id, cruce]));

  // El partido del cruce que apunta al cruce siguiente.
  const salidaDe = (cruce: CruceDeBase): EnfrentamientoDeBracket =>
    cruce.vuelta ?? cruce.ida;

  // Saltos hasta la final. El tope evita un bucle si los datos tuvieran un ciclo.
  const distanciaAFinal = (cruce: CruceDeBase): number => {
    let distancia = 0;
    let actual = cruce;
    while (distancia < cruces.length) {
      const siguienteId = salidaDe(actual).siguienteId;
      const siguiente =
        siguienteId === null ? undefined : cruceDeIda.get(siguienteId);
      if (siguiente === undefined) {
        break;
      }
      actual = siguiente;
      distancia += 1;
    }
    return distancia;
  };

  const distancias = new Map(
    cruces.map((cruce) => [cruce.ida.id, distanciaAFinal(cruce)])
  );
  const cantidadRondas = Math.max(...distancias.values()) + 1;

  // Los cruces vienen en orden de id: el primero que alimenta a uno es el A.
  const ladoPorSalida = new Map<number, 'A' | 'B'>();
  const yaTieneA = new Set<number>();
  cruces.forEach((cruce) => {
    const salida = salidaDe(cruce);
    if (salida.siguienteId === null) {
      return;
    }
    if (yaTieneA.has(salida.siguienteId)) {
      ladoPorSalida.set(salida.id, 'B');
    } else {
      yaTieneA.add(salida.siguienteId);
      ladoPorSalida.set(salida.id, 'A');
    }
  });

  return Array.from({ length: cantidadRondas }, (_, indice) => {
    const ronda = indice + 1;
    const delaRonda = cruces.filter(
      (cruce) => cantidadRondas - (distancias.get(cruce.ida.id) ?? 0) === ronda
    );

    const aPartido = (
      partido: EnfrentamientoDeBracket,
      numeroEnRonda: number,
      esBye: boolean
    ): PartidoBracketPublico => ({
      id: partido.id,
      numeroEnRonda,
      equipoA: partido.equipoA,
      equipoB: partido.equipoB,
      resultadoA: partido.resultadoA,
      resultadoB: partido.resultadoB,
      ganadorId: partido.ganadorId,
      siguienteId: partido.siguienteId,
      ladoSiguiente: ladoPorSalida.get(partido.id) ?? null,
      esBye,
    });

    return {
      ronda,
      // El nombre de la ronda es el de la ida sin el sufijo.
      instancia:
        delaRonda[0]?.ida.instancia?.replace(/_ida$/, '') ?? `ronda_${ronda}`,
      cruces: delaRonda.map((cruce, posicion): CruceIdaYVuelta => {
        const numeroEnRonda = posicion + 1;
        const esBye = cruce.vuelta === null;

        return {
          numeroEnRonda,
          ida: aPartido(cruce.ida, numeroEnRonda, esBye),
          vuelta:
            cruce.vuelta === null
              ? null
              : aPartido(cruce.vuelta, numeroEnRonda, false),
          ganadorId: salidaDe(cruce).ganadorId,
        };
      }),
    };
  });
};

/**
 * Cuadro de una fase de eliminación de un torneo del organizador (404 si no
 * es suyo). Sin faseId usa la fase activa. Si la fase es a ida y vuelta, cada
 * ronda trae cruces con sus dos partidos (ver armarRondasIdaYVuelta). Las fases de liga o grupos no se
 * muestran como cuadro (409): tienen tabla de posiciones.
 */
export const obtenerBracket = async (
  torneoId: number,
  usuarioId: number,
  faseId?: number
): Promise<BracketTorneo> => {
  await obtenerTorneo(torneoId, usuarioId);
  const fases = await posicionRepository.listarFasesDeTorneo(torneoId);
  const fase = elegirFase(fases, faseId);

  if (fase.tipo !== TIPO_FASE_ELIMINACION) {
    throw new AppError(
      'Solo las fases de eliminación se muestran como cuadro: las de liga y grupos tienen tabla de posiciones.',
      409
    );
  }

  const enfrentamientos = await bracketRepository.listarEnfrentamientosDeFase(
    fase.id
  );

  if (fase.idaYVuelta) {
    return {
      faseId: fase.id,
      estado: fase.estado,
      idaYVuelta: true,
      rondas: armarRondasIdaYVuelta(enfrentamientos),
    };
  }

  return {
    faseId: fase.id,
    estado: fase.estado,
    idaYVuelta: false,
    rondas: armarRondas(enfrentamientos),
  };
};
