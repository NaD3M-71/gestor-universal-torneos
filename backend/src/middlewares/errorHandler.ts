import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { ErrorValidacion } from '../errors/ErrorValidacion';

/**
 * Se ejecuta cuando ninguna ruta respondió: genera un 404 y lo delega al
 * manejador de errores.
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
};

/**
 * Manejador central de errores. Debe registrarse al final de app.ts, después
 * de todas las rutas. Express lo reconoce por tener cuatro parámetros.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Si ya se empezó a enviar la respuesta, Express se encarga de cerrarla.
  if (res.headersSent) {
    next(err);
    return;
  }

  let statusCode = 500;
  let mensaje = 'Error interno del servidor.';
  let detalles: ErrorValidacion['detalles'] | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    mensaje = err.message;
    if (err instanceof ErrorValidacion) {
      detalles = err.detalles;
    }
  } else if (err instanceof SyntaxError && 'body' in err) {
    // express.json() lanza esto cuando el cuerpo no es un JSON válido.
    statusCode = 400;
    mensaje = 'El cuerpo de la petición no es un JSON válido.';
  } else {
    // Error inesperado: se registra completo pero no se expone al cliente.
    console.error('Error no controlado:', err);
  }

  const stack =
    env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined;

  res.status(statusCode).json({
    error: {
      mensaje,
      ...(detalles !== undefined && { detalles }),
      ...(stack !== undefined && { stack }),
    },
  });
};