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
