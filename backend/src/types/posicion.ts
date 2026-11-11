import type { SistemaPuntuacion } from '@prisma/enums';

/**
 * Una fila de la tabla de posiciones. No se guarda en la base: se calcula
 * agregando los enfrentamientos jugados de la fase.
 *
 * Con ganada_perdida no hay empates (pe es siempre 0) y los puntos son los
 * partidos ganados.
 *
 * aFavor, enContra y diferencia son informativos: sirven para que el
 * organizador desempate al cierre de la fase. Solo suman de los partidos que
 * tienen marcador cargado, y no son necesariamente goles.
 */
export interface FilaPosicion {
  /** Lugar en la tabla, secuencial (1, 2, 3...). */
  posicion: number;
  equipoId: number;
  nombre: string;
  grupo: number | null;
  /** Partidos jugados, ganados, empatados y perdidos. */
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  puntos: number;
  aFavor: number;
  enContra: number;
  diferencia: number;
  /** Orden manual de desempate que define el organizador (Equipo). */
  ventajaDesempate: number;
}

/** Respuesta de GET /api/torneos/:torneoId/posiciones. */
export interface TablaPosiciones {
  faseId: number;
  sistemaPuntuacion: SistemaPuntuacion;
  posiciones: FilaPosicion[];
  /** Cómo resolvió el organizador el desempate (Fase), si lo aclaró. */
  comentarioDesempate: string | null;
}

/** Puntos que suma cada resultado según el sistema de puntuación. */
export interface PuntosPorResultado {
  victoria: number;
  empate: number;
}

/** Equipo con los datos que hacen falta para armar su fila de la tabla. */
export interface EquipoParaTabla {
  id: number;
  nombre: string;
  grupo: number | null;
  ventajaDesempate: number;
}

/**
 * Enfrentamiento ya jugado de una fase (con ganador o con marcador cargado) y
 * con sus dos equipos definidos.
 */
export interface EnfrentamientoJugado {
  equipoAId: number;
  equipoBId: number;
  resultadoA: number | null;
  resultadoB: number | null;
  ganadorId: number | null;
}
