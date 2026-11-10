import { describe, it, expect } from "vitest";
import { extraerErrorDetallado } from "../../../shared/utils/errorHandler";

describe("errorHandler utils", () => {
  it("debe extraer correctamente un error de validación con detalles", () => {
    const errorSimulado = {
      response: {
        data: {
          error: {
            mensaje: "Los datos enviados no son válidos.",
            detalles: [
              { campo: "email", mensaje: "El formato del correo es inválido." },
            ],
          },
        },
      },
    };

    const resultado = extraerErrorDetallado(errorSimulado);

    expect(resultado.mensaje).toBe("El formato del correo es inválido.");
    expect(resultado.campoError).toBe("email");
  });

  it("debe devolver el mensaje por defecto si el error es desconocido", () => {
    const resultado = extraerErrorDetallado(
      {},
      "Error personalizado por defecto",
    );

    expect(resultado.mensaje).toBe("Error personalizado por defecto");
    expect(resultado.campoError).toBeUndefined();
  });
});
