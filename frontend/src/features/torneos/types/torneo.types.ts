export type EstadoTorneo = "borrador" | "en_curso" | "finalizado" | "cancelado";
export type FormatoTorneo =
  | "liga_simple"
  | "liga_doble"
  | "eliminacion_simple"
  | "eliminacion_doble"
  | "liguilla_eliminacion"
  | "grupos_eliminatorias";
export type SistemaPuntuacion =
  "ganada_perdida" | "futbol_clasico" | "sistema_alternativo";

export interface Torneo {
  id: number;
  nombre: string;
  descripcion: string | null;
  formato: FormatoTorneo;
  sistemaPuntuacion: SistemaPuntuacion;
  cantidadParticipantes: number;
  cantidadGrupos: number | null;
  fechaInicio: string | null;
  estado: EstadoTorneo;
  campeonId: number | null;
  campeon?: { nombre: string } | null; // Si el backend incluye la relación
}

export interface CrearTorneoDTO {
  nombre: string;
  descripcion?: string | null;
  formato: FormatoTorneo;
  sistemaPuntuacion: SistemaPuntuacion;
  cantidadParticipantes: number;
  cantidadGrupos?: number | null;
  lineaCorte?: number | null;
  fechaInicio?: string | null;
}

export type ActualizarTorneoDTO = Partial<CrearTorneoDTO>;

export const DESCRIPCIONES_FORMATO: Record<string, string> = {
  liga_simple:
    "Todos los equipos se enfrentan una vez. El campeón se define por puntos.",
  liga_doble:
    "Todos los equipos se enfrentan dos veces (ida y vuelta). El campeón se define por puntos.",
  eliminacion_simple:
    "Llave de eliminación directa. El que pierde, queda fuera.",
  eliminacion_doble:
    "Un equipo debe perder dos partidos para quedar eliminado.",
  liguilla_eliminacion:
    "Fase regular de todos contra todos. Los mejores clasifican a una llave de playoffs.",
  grupos_eliminatorias:
    "Los equipos se dividen en grupos. Los mejores de cada grupo avanzan a la fase eliminatoria.",
};
