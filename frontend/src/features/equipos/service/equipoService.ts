import { axiosClient } from "@axios-client";
import type {
  Equipo,
  CrearEquipoDTO,
  ActualizarEquipoDTO,
} from "../types/equipo.types";

export const obtenerEquipos = async (torneoId: number): Promise<Equipo[]> => {
  const response = await axiosClient.get(`/torneos/${torneoId}/equipos`);
  return response.data.equipos;
};

export const crearEquipo = async (
  torneoId: number,
  datos: CrearEquipoDTO,
): Promise<Equipo> => {
  const response = await axiosClient.post(
    `/torneos/${torneoId}/equipos`,
    datos,
  );
  return response.data.equipo;
};

export const actualizarEquipo = async (
  torneoId: number,
  equipoId: number,
  datos: ActualizarEquipoDTO,
): Promise<Equipo> => {
  const response = await axiosClient.patch(
    `/torneos/${torneoId}/equipos/${equipoId}`,
    datos,
  );
  return response.data.equipo;
};

export const eliminarEquipo = async (
  torneoId: number,
  equipoId: number,
): Promise<void> => {
  await axiosClient.delete(`/torneos/${torneoId}/equipos/${equipoId}`);
};

export interface AsignacionGrupoPayload {
  equipoId: number;
  grupo: number | null;
}

export const asignarGrupos = async (
  torneoId: number,
  asignaciones: AsignacionGrupoPayload[],
) => {
  const response = await axiosClient.put(`/torneos/${torneoId}/grupos`, {
    asignaciones,
  });
  return response.data.equipos;
};

export const sortearGrupos = async (torneoId: number) => {
  const response = await axiosClient.post(`/torneos/${torneoId}/grupos/sorteo`);
  return response.data.equipos;
};
