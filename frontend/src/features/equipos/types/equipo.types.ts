export interface Integrante {
  id: number;
  nombre: string;
}

export interface Equipo {
  id: number;
  torneoId: number;
  nombre: string;
  grupo: number | null;
  integrantes: Integrante[];
}

export interface CrearEquipoDTO {
  nombre: string;
  integrantes?: string[];
}

export type ActualizarEquipoDTO = Partial<CrearEquipoDTO>;
