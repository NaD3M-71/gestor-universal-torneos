import { axiosClient } from "../../../shared/api/axiosClient";
import type {
  UsuarioPublico,
  CredencialesLogin,
  DatosRegistro,
} from "../types/auth.types";

// Interfaces para tipar la respuesta exacta que manda el backend de Node
interface AuthResponse {
  usuario: UsuarioPublico;
}

export const authService = {
  async login(credenciales: CredencialesLogin): Promise<UsuarioPublico> {
    // El backend responde: { usuario: { id, nombre, apellido, email } }
    const { data } = await axiosClient.post<AuthResponse>(
      "/auth/login",
      credenciales,
    );
    return data.usuario;
  },

  async register(datos: DatosRegistro): Promise<UsuarioPublico> {
    const { data } = await axiosClient.post<AuthResponse>(
      "/auth/registro",
      datos,
    );
    return data.usuario;
  },

  async logout(): Promise<void> {
    await axiosClient.post("/auth/logout");
  },

  getCurrentUser: async (): Promise<UsuarioPublico> => {
    const response = await axiosClient.get("/auth/me");
    return response.data.usuario;
  },
};
