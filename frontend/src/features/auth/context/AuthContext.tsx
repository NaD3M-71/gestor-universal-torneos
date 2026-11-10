// Estado global de sesión y proveedor
// administra la sesión del usuario en toda la aplicación de React

import { useEffect, useState, type ReactNode } from "react";
import type {
  UsuarioPublico,
  CredencialesLogin,
  DatosRegistro,
} from "../types/auth.types";
import { authService } from "../services/auth.service";
import { AuthContext } from "./AuthContextObject"; // Importamos el contexto desde su archivo dedicado

// EL PROVEEDOR DE CONTEXTO
// El componente que envuelve a la app y en consecuencia a todos los componentes de la aplicación
export function AuthProvider({ children }: { children: ReactNode }) {
  // ESTADO GLOBAL 'user': guarda el objeto del usuario logueado o 'null' si nadie inició sesión
  const [user, setUser] = useState<UsuarioPublico | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const verificarSesionActiva = async () => {
      try {
        // Llama al endpoint del usuario actual
        const usuarioData = await authService.getCurrentUser();
        setUser(usuarioData);
      } finally {
        // Si la cookie no existe o expiró, el backend responderá con error y dejamos el usuario en null
        setUser(null);
        setIsLoading(false);
      }
    };

    verificarSesionActiva();
  }, []);

  const login = async (credenciales: CredencialesLogin) => {
    setIsLoading(true);
    try {
      const usuarioData = await authService.login(credenciales);
      setUser(usuarioData);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (datos: DatosRegistro) => {
    setIsLoading(true);
    try {
      const usuarioData = await authService.register(datos);
      setUser(usuarioData);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Entregamos todos los valores del contexto a cualquier componente hijo que los pida.
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
