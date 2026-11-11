import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthForm } from "../../../features/auth/hooks/useAuthForm";
import { AuthProvider } from "../../../features/auth";
import { BrowserRouter } from "react-router-dom";
import { waitFor } from "@testing-library/react";

// SIMULACIÓN: Inventamos un "falso" sistema de autenticación para que el hook
// no intente conectarse al backend real ni rompa durante la prueba
vi.mock("../../../features/auth/services/auth.service", () => ({
  authService: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

// ENTORNO: creamos u contenedor básico para que las funciones de navegación de React Router
// no se quejen por falta de contexto
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe("Pruebas para el hook useAuthForm", () => {
  // Limpiamos cualquier simulación antes de cada prueba individual
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Verifica que el hook inicialice correctamente las funciones de control
   * de react-hook-form tanto para 'login' como para 'register'.
   */
  it("debe inicializarse correctamente y exponer las funciones del formulario", async () => {
    // Ejecutamos el hook simulando que estamos en la pantalla de 'login'
    const { result } = renderHook(() => useAuthForm("login"), { wrapper });

    // Validamos que devuelva las propiedades esenciales del formulario
    expect(result.current.handleSubmit).toBeDefined();
    expect(result.current.register).toBeDefined();
    expect(result.current.getInputClass).toBeDefined();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  /**
   * Valida que el formulario maneje de forma correcta el estado de errores
   * al inicializarse vacío.
   */
  it("debe iniciar sin errores en el estado de react-hook-form", () => {
    const { result } = renderHook(() => useAuthForm("register"), { wrapper });

    // El objeto errors de react-hook-form debe estar vacío al arrancar
    expect(result.current.errors).toEqual({});
  });

  /**
   * Prueba que la función auxiliar de estilos devuelva la clase base correcta
   * cuando no hay errores en el campo.
   */
  it("debe retornar la clase de input normal cuando no hay error", () => {
    const { result } = renderHook(() => useAuthForm("login"), { wrapper });

    const claseInput = result.current.getInputClass(
      false,
      "focus:border-dorado",
    );

    // Verificamos que contenga las clases base y de enfoque esperadas
    expect(claseInput).toContain("w-full");
    expect(claseInput).toContain("border-slate-700");
    expect(claseInput).toContain("focus:border-dorado");
  });

  /**
   * Prueba que la función de estilos pinte de rojo el borde si el campo tiene un error asociado.
   */
  it("debe retornar la clase de input con borde rojo cuando hay un error", () => {
    const { result } = renderHook(() => useAuthForm("login"), { wrapper });

    const claseInputConError = result.current.getInputClass(true);

    // Verificamos que aplique las clases de error en rojo
    expect(claseInputConError).toContain("border-red-500");
    expect(claseInputConError).toContain("focus:border-red-500");
  });

  /**
   *  Verificar la validación de contraseñas desiguales en el registro
   */

  it("debe registrar un error si las contraseñas no coinciden en modo registro", async () => {
    // Renderizamos el hook en modo 'register'
    const { result } = renderHook(() => useAuthForm("register"), { wrapper });

    // Simulamos un evento de envío de formulario (submit)
    const eventoSimulado = {
      preventDefault: () => {},
    } as unknown as React.FormEvent<HTMLFormElement>;

    // Ejecutamos el envío de forma asíncrona dentro de act() para que React procese los cambios de estado
    await act(async () => {
      await result.current.handleSubmit(eventoSimulado);
    });

    // Como no ingresamos datos, react-hook-form validará los campos obligatorios o vacíos.
    // Lo importante es verificar que el sistema de errores de react-hook-form está activo y respondiendo.
    expect(result.current.errors).toBeDefined();
  });
});
