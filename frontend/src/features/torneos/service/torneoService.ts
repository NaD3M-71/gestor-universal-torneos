import { axiosClient } from "@axios-client"; // Tu instancia configurada de axios
import type { Torneo } from "../types/torneo.types";

export const obtenerTorneos = async (): Promise<Torneo[]> => {
  const response = await axiosClient.get("/torneos");
  return response.data.torneos;
};

export const cancelarTorneoService = async (id: number): Promise<void> => {
  await axiosClient.patch(`/torneos/${id}/cancelar`);
};

export const eliminarTorneoBorradorService = async (
  id: number,
): Promise<void> => {
  await axiosClient.delete(`/torneos/${id}`);
};
