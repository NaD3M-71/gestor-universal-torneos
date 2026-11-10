import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { extraerErrorDetallado } from "../../../shared/utils/errorHandler";
import type { DatosRegistro, CredencialesLogin } from "../types/auth.types";

// Interfaz que engloba los campos posibles para ambos formularios
export interface AuthFormData extends Partial<DatosRegistro> {
  repetirContrasenia?: string;
}

type TipoFormulario = "login" | "register";

export function useAuthForm(tipo: TipoFormulario) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AuthFormData>();

  const { login, register: registrarUsuario, isLoading } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: AuthFormData) => {
    try {
      if (tipo === "register") {
        // Validación local: contraseñas iguales
        if (data.contrasenia !== data.repetirContrasenia) {
          setError("repetirContrasenia", {
            type: "manual",
            message: "Las contraseñas no coinciden.",
          });
          return;
        }

        const datosBackend: DatosRegistro = {
          nombre: data.nombre ?? "",
          apellido: data.apellido ?? "",
          email: data.email ?? "",
          contrasenia: data.contrasenia ?? "",
        };

        await registrarUsuario(datosBackend as DatosRegistro);
      } else {
        await login(data as CredencialesLogin);
      }

      navigate("/");
    } catch (err: unknown) {
      const mensajeDefecto =
        tipo === "login" ? "Error al iniciar sesión." : "Error al registrarse.";
      const resultado = extraerErrorDetallado(err, mensajeDefecto);

      if (resultado.campoError) {
        setError(resultado.campoError as keyof AuthFormData, {
          type: "server",
          message: resultado.mensaje,
        });
      } else {
        setError("root", {
          type: "server",
          message: resultado.mensaje,
        });
      }
    }
  };

  // Estilo dinámico reutilizable para los inputs con bordes rojos
  const getInputClass = (
    hasError?: boolean,
    colorFocus: string = "focus:border-dorado",
  ) => {
    const base =
      "w-full px-4 py-2 bg-slate-900 border rounded-lg text-white focus:outline-none";
    return hasError
      ? `${base} border-red-500 focus:border-red-500`
      : `${base} border-slate-700 ${colorFocus}`;
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isLoading,
    getInputClass,
  };
}
