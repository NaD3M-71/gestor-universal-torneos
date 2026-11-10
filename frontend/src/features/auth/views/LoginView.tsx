import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      // Llamamos a la función de login del contexto
      await login({ email, contrasenia });
      // Si todo sale bien, redirigimos al usuario a la página principal (o a un dashboard)
      navigate("/");
    } catch (err: unknown) {
      // Si el backend rechaza las credenciales, capturamos el error para mostrarlo
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
          errorObj.response?.data?.mensaje || "Error al iniciar sesión.",
        );
      }
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-grafito">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-azulAcero shadow-xl">
        <h2 className="text-3xl font-extrabold text-dorado text-center mb-6">
          Iniciar Sesión
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-dorado"
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
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-dorado"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-azulAcero hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg disabled:opacity-50"
          >
            {isLoading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Aún no tienes cuenta?{" "}
          <Link
            to="/registro"
            className="text-dorado hover:underline font-semibold"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
