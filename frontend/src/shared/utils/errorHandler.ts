export interface ResultadoError {
  mensaje: string;
  campoError?: string; // Ej: "email", "contrasenia", etc.
}

export function extraerErrorDetallado(
  err: unknown,
  mensajePorDefecto: string = "Ocurrió un error inesperado.",
): ResultadoError {
  const errorObj = err as {
    response?: {
      data?: {
        error?: {
          mensaje?: string;
          detalles?: Array<{ campo: string; mensaje: string }>;
        };
        mensaje?: string;
      };
    };
  };

  const errorData = errorObj.response?.data?.error;

  // 1. Si hay detalles específicos por campo (provenientes de tu ErrorValidacion del backend)
  if (errorData?.detalles && errorData.detalles.length > 0) {
    return {
      mensaje: errorData.detalles[0].mensaje,
      campoError: errorData.detalles[0].campo, // <- Guardamos qué campo falló
    };
  }

  // 2. Si hay un mensaje dentro del objeto 'error'
  if (errorData?.mensaje) {
    return { mensaje: errorData.mensaje };
  }

  // 3. Si el mensaje viene plano en data.mensaje
  if (errorObj.response?.data?.mensaje) {
    return { mensaje: errorObj.response.data.mensaje };
  }

  return { mensaje: mensajePorDefecto };
}
