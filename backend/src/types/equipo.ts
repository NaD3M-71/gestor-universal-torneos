/** Integrante de un equipo tal como se devuelve a la API. */
export interface IntegrantePublico {
  id: number;
  nombre: string;
}

/**
 * Datos públicos de un equipo, con sus integrantes. El grupo es null mientras
 * no se asigne (o si el torneo no usa grupos). No incluye la ventaja de
 * desempate: la maneja la lógica del torneo en curso.
 */
export interface EquipoPublico {
  id: number;
  torneoId: number;
  nombre: string;
  grupo: number | null;
  integrantes: IntegrantePublico[];
}

/**
 * Datos para inscribir un equipo (DTO de entrada). Sin integrantes, el equipo
 * representa a un jugador individual.
 */
export interface DatosNuevoEquipo {
  nombre: string;
  integrantes?: string[];
}

/**
 * Datos para editar un equipo (todos opcionales). Si se envían integrantes, la
 * lista nueva reemplaza a la anterior.
 */
export interface DatosActualizarEquipo {
  nombre?: string;
  integrantes?: string[];
}

/** Grupo (1..cantidadGrupos) de un equipo; null lo deja sin grupo. */
export interface AsignacionGrupo {
  equipoId: number;
  grupo: number | null;
}
