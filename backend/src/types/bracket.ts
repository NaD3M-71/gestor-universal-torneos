/** Equipo tal como se muestra dentro de un partido del cuadro. */
export interface EquipoBracket {
  id: number;
  nombre: string;
}

/**
 * Enfrentamiento de una fase de eliminación tal como sale de la base, con el
 * nombre de sus equipos. Los equipos son null mientras el partido espera a los
 * ganadores de la ronda anterior (o, en la primera ronda, cuando hay bye).
 */
export interface EnfrentamientoDeBracket {
  id: number;
  instancia: string | null;
  siguienteId: number | null;
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

/** Respuesta de GET /api/torneos/:torneoId/bracket (dentro de { bracket }). */
export interface BracketTorneo {
  faseId: number;
  estado: string;
  idaYVuelta: boolean;
  /** De la primera ronda a la final. Vacío si la fase todavía no tiene partidos. */
  rondas: RondaBracket[];
}
