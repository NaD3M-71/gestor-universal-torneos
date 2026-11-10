import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function RegisterView() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      await register({ nombre, apellido, email, contrasenia });
      navigate("/");
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          data?: {
            mensaje?: string;
            detalles?: Array<{ mensaje: string }>;
          };
        };
      };

      const backendDetalles = errorObj.response?.data?.detalles;
      if (backendDetalles && backendDetalles.length > 0) {
        setError(backendDetalles[0].mensaje);
      } else {
        setError(
          errorObj.response?.data?.mensaje ||
            "Error al registrarse. Intente nuevamente.",
        );
      }
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-grafito">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-verdeVictoria shadow-xl">
        <h2 className="text-3xl font-extrabold text-verdeVictoria text-center mb-6">
          Crear Cuenta
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-verdeVictoria"
                placeholder="Juan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Apellido
              </label>
              <input
                type="text"
                required
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-verdeVictoria"
                placeholder="Perez"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-verdeVictoria"
              placeholder="organizador@torneo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={contrasenia}
              onChange={(e) => setContrasenia(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-verdeVictoria"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-verdeVictoria hover:bg-teal-600 text-grafito font-bold py-3 rounded-xl transition-colors shadow-lg disabled:opacity-50 mt-2"
          >
            {isLoading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Ya tienes una cuenta?{" "}
          <Link
            to="/login"
            className="text-dorado hover:underline font-semibold"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
