import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, LoginView, RegisterView } from "./features/auth";
import { HomeView } from "./features/home";
import { MainLayout } from "./shared/components/Layout";

export default function App() {
  return (
    // BrowserRouter envuelve toda la app para habilitar el sistema de URLs del navegador
    <BrowserRouter>
      {/* AuthProvider provee el estado global de sesión de usuario*/}
      <AuthProvider>
        <Routes>
          {/* Todas las rutas dependen del MainLayout general */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomeView />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/registro" element={<RegisterView />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
