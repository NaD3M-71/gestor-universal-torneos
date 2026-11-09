import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ErrorValidacion } from './ErrorValidacion';

/**
 * Va en la ruta justo después de las cadenas de validación. Si alguna falló,
 * corta la petición con un ErrorValidacion (400) que el manejador central de
 * errores convierte en la respuesta. Si no hubo errores, deja pasar al
 * controlador.
 */
export const handleInputErrors = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const resultado = validationResult(req);

  if (resultado.isEmpty()) {
    next();
    return;
  }

  // Un solo mensaje por campo: el primero que falló.
  const detalles = resultado.array({ onlyFirstError: true }).map((error) => ({
    campo: error.type === 'field' ? error.path : error.type,
    mensaje: String(error.msg),
  }));

  next(new ErrorValidacion(detalles));
};
