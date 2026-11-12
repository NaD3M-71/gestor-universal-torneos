import type { TorneoPublico } from './torneo';

/** Tipos de fase que maneja el sistema (la columna tipo es un texto libre). */
export type TipoFase = 'liga' | 'eliminacion' | 'grupos';

/**
 * Datos públicos de una fase tal como se devuelven a la API o al cliente.
 */
export interface FasePublica {
  id: number;
  torneoId: number;
  tipo: string;
  orden: number;
  estado: string;
  lineaDeCorte: number | null;
  idaYVuelta: boolean;
  comentarioDesempate: string | null;
}

/**
 * Datos para crear una fase. El torneo y el estado (activa) los completa el
 * repositorio.
 */
export interface DatosNuevaFase {
  tipo: TipoFase;
  orden: number;
  idaYVuelta: boolean;
}

/**
 * Datos para crear un enfrentamiento de una fase. La fase la completa el
 * repositorio al crearlo junto con ella.
 */
export interface DatosNuevoEnfrentamiento {
  equipoAId: number;
  equipoBId: number;
  instancia: string;
}

/**
 * Partido de un cuadro de eliminación listo para guardar. Los equipos pueden
 * ser null (partido de una ronda futura, o bye sin rival). siguienteIndice es
 * la posición, dentro de la misma lista, del partido al que pasa el ganador.
 * Es un subconjunto de PartidoAsignado del bracket engine.
 */
export interface DatosNuevoPartidoBracket {
  indice: number;
  ronda: number;
  instancia: string;
  equipoAId: number | null;
  equipoBId: number | null;
  ganadorId: number | null;
  siguienteIndice: number | null;
}

/** Resultado de iniciar un torneo: el torneo ya en curso y su primera fase. */
export interface TorneoIniciado {
  torneo: TorneoPublico;
  fase: FasePublica;
}
