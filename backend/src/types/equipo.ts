/** Integrante de un equipo tal como se devuelve a la API. */
export interface IntegrantePublico {
  id: number;
  nombre: string;
}

/**
 * Datos públicos de un equipo, con sus integrantes. No incluye el grupo ni la
 * ventaja de desempate: los maneja la lógica del torneo en curso.
 */
export interface EquipoPublico {
  id: number;
  torneoId: number;
  nombre: string;
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
