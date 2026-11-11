import type {
  EstadoTorneo,
  FormatoTorneo,
  SistemaPuntuacion,
} from '@prisma/enums';

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
}
