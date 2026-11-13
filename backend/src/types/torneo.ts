import type {
  EstadoTorneo,
  FormatoTorneo,
  SistemaPuntuacion,
} from '@prisma/enums';
import type { FasePublica } from './fase';

/**
 * Datos públicos de un torneo tal como se devuelven a la API o al cliente.
 */
export interface TorneoPublico {
  id: number;
  creadorId: number;
  nombre: string;
  descripcion: string | null;
  formato: FormatoTorneo;
  sistemaPuntuacion: SistemaPuntuacion;
  cantidadParticipantes: number;
  cantidadGrupos: number | null;
  fechaInicio: Date | null;
  estado: EstadoTorneo;
  campeonId: number | null;
  campeon?: {
    id: number;
    nombre: string;
  } | null;
  /** Fases del torneo, de la primera a la última (no vienen en el listado). */
  fases?: FasePublica[];
}

/**
 * Datos necesarios para crear un torneo nuevo (DTO de entrada).
 * El estado no se envía: todo torneo nace en borrador.
 */
export interface DatosNuevoTorneo {
  creadorId: number;
  nombre: string;
  descripcion?: string | null;
  formato: FormatoTorneo;
  sistemaPuntuacion: SistemaPuntuacion;
  cantidadParticipantes: number;
  cantidadGrupos?: number | null;
  fechaInicio?: Date | null;
  /**
   * Línea de corte de la primera fase. No es una columna del torneo: se guarda
   * en su fase 1. Solo aplica a liguilla_eliminacion (cuántos clasifican en
   * total) y grupos_eliminatorias (cuántos clasifican por grupo).
   */
  lineaDeCorte?: number | null;
  /**
   * Si la fase de eliminación se juega a ida y vuelta. Tampoco es una columna
   * del torneo: se guarda en su fase de eliminación. Solo se puede pedir en
   * liguilla_eliminacion y grupos_eliminatorias; en los demás formatos la ida y
   * vuelta la define el propio formato (liga_doble, eliminacion_doble).
   * Si no se indica, es false.
   */
  idaYVuelta?: boolean;
}

/**
 * Datos para editar un torneo en borrador (todos opcionales). Con null se
 * vacía un campo opcional. El estado y el campeón no se editan por acá: los
 * cambia la lógica de inicio y cierre del torneo.
 */
export interface DatosActualizarTorneo {
  nombre?: string;
  descripcion?: string | null;
  formato?: FormatoTorneo;
  sistemaPuntuacion?: SistemaPuntuacion;
  cantidadParticipantes?: number;
  cantidadGrupos?: number | null;
  fechaInicio?: Date | null;
  lineaDeCorte?: number | null;
  idaYVuelta?: boolean;
}
