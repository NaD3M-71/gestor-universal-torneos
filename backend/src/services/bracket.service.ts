import * as bracketRepository from '@repositories/bracket.repository';
import * as posicionRepository from '@repositories/posicion.repository';
import { elegirFase } from '@services/posicion.service';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../middlewares/errors/AppError';
import type {
  BracketTorneo,
  EnfrentamientoDeBracket,
  RondaBracket,
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

/**
 * Cuadro de una fase de eliminación de un torneo del organizador (404 si no
 * es suyo). Sin faseId usa la fase activa. Las fases de liga o grupos no se
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

  return {
    faseId: fase.id,
    estado: fase.estado,
    idaYVuelta: fase.idaYVuelta,
    rondas: armarRondas(enfrentamientos),
  };
};
