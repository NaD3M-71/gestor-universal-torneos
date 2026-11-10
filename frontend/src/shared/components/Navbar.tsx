import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-azulAcero px-6 py-4 flex justify-between items-center shadow-md">
      {/* Logo y Nombre que te llevan al Home */}
      <Link to="/" className="flex items-center space-x-3 cursor-pointer">
        <img
          src="/logo-transparente.png"
          alt="Logo Torneos"
          className="w-10 h-10 object-contain"
        />
        <span className="text-dorado font-bold text-xl tracking-wide">
          Gestor Universal
        </span>
      </Link>

      {/* Acciones de Autenticación */}
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">
              Hola, <strong className="text-white">{user.nombre}</strong>
            </span>
            <button
              onClick={() => logout()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div className="flex space-x-3">
            <Link
              to="/login"
              className="text-gray-300 hover:text-dorado px-4 py-2 text-sm font-semibold transition-colors"
            >
              Login
            </Link>
            <Link
              to="/registro"
              className="bg-azulAcero hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow"
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
