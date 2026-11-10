import { Link } from "react-router-dom";
import { useAuthForm } from "../hooks/useAuthForm";

export function RegisterView() {
  const { register, handleSubmit, errors, isLoading, getInputClass } =
    useAuthForm("register");

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-grafito">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-verdeVictoria shadow-xl">
        <h2 className="text-3xl font-extrabold text-verdeVictoria text-center mb-6">
          Crear Cuenta
        </h2>

        {errors.root && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg text-center">
            {errors.root.message}
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
                {...register("nombre", {
                  required: "El nombre es obligatorio",
                })}
                className={getInputClass(
                  !!errors.nombre,
                  "focus:border-verdeVictoria",
                )}
                placeholder="Juan"
              />
              {errors.nombre && (
                <span className="text-xs text-red-400 mt-1 block">
                  {errors.nombre.message}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Apellido
              </label>
              <input
                type="text"
                {...register("apellido", {
                  required: "El apellido es obligatorio",
                })}
                className={getInputClass(
                  !!errors.apellido,
                  "focus:border-verdeVictoria",
                )}
                placeholder="Perez"
              />
              {errors.apellido && (
                <span className="text-xs text-red-400 mt-1 block">
                  {errors.apellido.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              {...register("email", { required: "El correo es obligatorio" })}
              className={getInputClass(
                !!errors.email,
                "focus:border-verdeVictoria",
              )}
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
                "focus:border-verdeVictoria",
              )}
              placeholder="••••••••"
            />
            {errors.contrasenia && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.contrasenia.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Repetir Contraseña
            </label>
            <input
              type="password"
              {...register("repetirContrasenia", {
                required: "Debe repetir la contraseña",
              })}
              className={getInputClass(
                !!errors.repetirContrasenia,
                "focus:border-verdeVictoria",
              )}
              placeholder="••••••••"
            />
            {errors.repetirContrasenia && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.repetirContrasenia.message}
              </span>
            )}
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
