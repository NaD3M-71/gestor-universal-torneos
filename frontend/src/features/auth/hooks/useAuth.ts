// Hook personalizado para consumir el contexto fácilmente
// En lugar de importar 'useContext' y 'AuthContext' en cada componente, usamos 'useAuth()'
import { useContext } from "react";
import { AuthContext } from "../context/AuthContextObject";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}
