# Guía de Uso: ProtectedRoute

El componente `ProtectedRoute` actúa como un "guardián" o filtro para proteger las vistas privadas de la aplicación que requieren que el usuario haya iniciado sesión.

## Ubicación
`src/shared/components/ProtectedRoute.tsx`

## ¿Cómo funciona?
1. Consulta el estado global de autenticación a través del hook `useAuth()`.
2. Si `isLoading` es `true`, muestra un indicador visual de carga para evitar parpadeos o redirecciones prematuras.
3. Si el usuario **no** está autenticado (`!user`), lo redirige automáticamente a la vista de `/login` utilizando `<Navigate to="/login" replace />`.
4. Si el usuario está autenticado, renderiza las vistas hijas utilizando `<Outlet />`.

## Ejemplo de implementación en el Router principal

```tsx
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { Login, Dashboard, Torneos } from '@/features/auth/views'; // (ejemplo de rutas)

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<Login/>} />

      {/* Rutas Protegidas */}
      <Route element={<ProtectedRoute/>}>
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/torneos" element={<Torneos/>} />
      </Route>
    </Routes>
  );
};