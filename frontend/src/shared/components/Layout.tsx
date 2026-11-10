// src/shared/components/MainLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";

export function MainLayout() {
  const location = useLocation();

  // Ocultamos el Navbar si estamos exactamente en /login o /registro
  const ocultarNavbar =
    location.pathname === "/login" || location.pathname === "/registro";

  return (
    <div className="min-h-screen bg-grafito text-white flex flex-col">
      {!ocultarNavbar && <Navbar />}

      {/* 
        <Outlet /> es el componente de React Router donde se renderizará automáticamente la vista que corresponda 
        según la ruta actual (HomeView, LoginView, RegisterView, etc.).
      */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
