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

/** Resultado de iniciar un torneo: el torneo ya en curso y su primera fase. */
export interface TorneoIniciado {
  torneo: TorneoPublico;
  fase: FasePublica;
}
