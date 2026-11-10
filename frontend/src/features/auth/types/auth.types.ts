// Tipos y DTOs (UsuarioPublico, Credenciales, etc.)
// lo alineamos con lo del backend

export interface UsuarioPublico {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface CredencialesLogin {
  email: string;
  contrasenia: string;
}

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  email: string;
  contrasenia: string;
}

// Lo que el contexto global va a ofrecer a toda la app
export interface AuthContextType {
  user: UsuarioPublico | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credenciales: CredencialesLogin) => Promise<void>;
  register: (datos: DatosRegistro) => Promise<void>;
  logout: () => Promise<void>;
}
