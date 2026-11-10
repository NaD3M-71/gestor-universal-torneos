import { EstadoTorneo, FormatoTorneo, SistemaPuntuacion } from '@prisma/enums';

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
}

/**
 * Datos necesarios para crear un torneo nuevo (DTO de entrada).
 */
export interface DatosNuevoTorneo {
  creadorId: number;
  nombre: string;
  descripcion?: string;
  formato: FormatoTorneo;
  sistemaPuntuacion: SistemaPuntuacion;
  cantidadParticipantes: number;
  cantidadGrupos?: number;
  fechaInicio?: Date;
}

/**
 * Datos para actualizar un torneo existente (permitiendo modificar campos de forma parcial).
 */
export interface DatosActualizarTorneo {
  nombre?: string;
  descripcion?: string;
  formato?: FormatoTorneo;
  sistemaPuntuacion?: SistemaPuntuacion;
  cantidadParticipantes?: number;
  cantidadGrupos?: number;
  fechaInicio?: Date;
  estado?: EstadoTorneo;
  campeonId?: number;
}
