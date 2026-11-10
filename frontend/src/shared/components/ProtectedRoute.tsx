import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth";

export const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  // Mostrar pantalla/spinner de carga
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario, permitir ver la vista protegida
  return <Outlet />;
};
