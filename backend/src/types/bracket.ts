/** Equipo tal como se muestra dentro de un partido del cuadro. */
export interface EquipoBracket {
  id: number;
  nombre: string;
}

/**
 * Enfrentamiento de una fase de eliminación tal como sale de la base, con el
 * nombre de sus equipos. Los equipos son null mientras el partido espera a los
 * ganadores de la ronda anterior (o, en la primera ronda, cuando hay bye).
 * vueltaDeId es el id de la ida cuando el partido es la vuelta de una serie.
 */
export interface EnfrentamientoDeBracket {
  id: number;
  instancia: string | null;
  siguienteId: number | null;
  vueltaDeId: number | null;
  resultadoA: number | null;
  resultadoB: number | null;
  ganadorId: number | null;
  equipoA: EquipoBracket | null;
  equipoB: EquipoBracket | null;
}

/** Un partido del cuadro, listo para dibujarse. */
export interface PartidoBracketPublico {
  id: number;
  /** Lugar dentro de su ronda, de arriba hacia abajo (1, 2, 3...). */
  numeroEnRonda: number;
  equipoA: EquipoBracket | null;
  equipoB: EquipoBracket | null;
  resultadoA: number | null;
  resultadoB: number | null;
  ganadorId: number | null;
  /** Partido de la ronda siguiente al que pasa el ganador (null en la final). */
  siguienteId: number | null;
  /** Lado en el que entra el ganador al partido siguiente (null en la final). */
  ladoSiguiente: 'A' | 'B' | null;
  /** Primera ronda sin rival: el equipo A pasa solo a la ronda siguiente. */
  esBye: boolean;
}

/** Una ronda del cuadro: todos los partidos que comparten instancia. */
export interface RondaBracket {
  /** 1 = primera ronda; la última es la final. */
  ronda: number;
  /** Nombre de la ronda: octavos, cuartos, semifinal, final... */
  instancia: string;
  partidos: PartidoBracketPublico[];
}

/**
 * Cruce de una eliminatoria a ida y vuelta: sus dos partidos. El ganador de la
 * vuelta es quien avanza en la serie (lo marca el organizador); la ida solo
 * lleva marcador. Un bye es un cruce de un solo partido, sin vuelta.
 */
export interface CruceIdaYVuelta {
  /** Lugar dentro de su ronda, de arriba hacia abajo (1, 2, 3...). */
  numeroEnRonda: number;
  /** La ida, o el partido del bye. */
  ida: PartidoBracketPublico;
  /** La vuelta, con los lados invertidos. null en un bye. */
  vuelta: PartidoBracketPublico | null;
  /** Quien avanza: ganador de la vuelta (o el equipo del bye). null hasta definirse. */
  ganadorId: number | null;
}

/** Una ronda de una eliminatoria a ida y vuelta: todos los cruces que comparten instancia. */
export interface RondaIdaYVuelta {
  /** 1 = primera ronda; la última es la final. */
  ronda: number;
  /** Nombre de la ronda sin el sufijo de ida o vuelta: cuartos, semifinal, final... */
  instancia: string;
  cruces: CruceIdaYVuelta[];
}

interface BracketBase {
  faseId: number;
  estado: string;
}

/** Cuadro de una fase de partido único. */
export interface BracketSimple extends BracketBase {
  idaYVuelta: false;
  /** De la primera ronda a la final. Vacío si la fase todavía no tiene partidos. */
  rondas: RondaBracket[];
}

/** Cuadro de una fase a ida y vuelta: cada ronda trae cruces con sus dos partidos. */
export interface BracketIdaYVuelta extends BracketBase {
  idaYVuelta: true;
  /** De la primera ronda a la final. Vacío si la fase todavía no tiene partidos. */
  rondas: RondaIdaYVuelta[];
}

/** Respuesta de GET /api/torneos/:torneoId/bracket (dentro de { bracket }). */
export type BracketTorneo = BracketSimple | BracketIdaYVuelta;
