import { axiosClient } from "@axios-client"; // Tu instancia configurada de axios
import type {
  Torneo,
  CrearTorneoDTO,
  ActualizarTorneoDTO,
} from "../types/torneo.types";

export const obtenerTorneo = async (id: number): Promise<Torneo> => {
  const response = await axiosClient.get(`/torneos/${id}`);
  return response.data.torneo;
};

export const obtenerTorneos = async (): Promise<Torneo[]> => {
  const response = await axiosClient.get("/torneos");
  return response.data.torneos;
};

export const cancelarTorneo = async (id: number): Promise<void> => {
  await axiosClient.patch(`/torneos/${id}/cancelar`);
};

export const eliminarTorneoBorrador = async (id: number): Promise<void> => {
  await axiosClient.delete(`/torneos/${id}`);
};

export const crearTorneo = async (datos: CrearTorneoDTO): Promise<Torneo> => {
  const response = await axiosClient.post("/torneos", datos);
  return response.data.torneo;
};

export const actualizarTorneo = async (
  id: number,
  cambios: ActualizarTorneoDTO,
): Promise<Torneo> => {
  const response = await axiosClient.patch(`/torneos/${id}`, cambios);
  return response.data.torneos;
};

export const iniciarTorneo = async (id: number): Promise<void> => {
  await axiosClient.patch(`/torneos/${id}/iniciar`);
};
