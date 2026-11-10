import { Link } from "react-router-dom";
import { useAuthForm } from "../hooks/useAuthForm";

export function LoginView() {
  const { register, handleSubmit, errors, isLoading, getInputClass } =
    useAuthForm("login");

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-grafito">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-azulAcero shadow-xl">
        <h2 className="text-3xl font-extrabold text-dorado text-center mb-6">
          Iniciar Sesión
        </h2>

        {errors.root && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg text-center">
            {errors.root.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              {...register("email", { required: "El correo es obligatorio" })}
              className={getInputClass(!!errors.email, "focus:border-dorado")}
              placeholder="organizador@torneo.com"
            />
            {errors.email && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              {...register("contrasenia", {
                required: "La contraseña es obligatoria",
              })}
              className={getInputClass(
                !!errors.contrasenia,
                "focus:border-dorado",
              )}
              placeholder="••••••••"
            />
            {errors.contrasenia && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.contrasenia.message}
              </span>
            )}
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
