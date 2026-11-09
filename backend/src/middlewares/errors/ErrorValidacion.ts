import { AppError } from './AppError';

/** Un problema de validación asociado a un campo del cuerpo de la petición. */
export interface DetalleValidacion {
  campo: string;
  mensaje: string;
}

/**
 * Error 400 por datos de entrada inválidos. Además del mensaje general lleva
 * un detalle por campo, para que el frontend pueda marcar cada campo del
 * formulario.
 */
export class ErrorValidacion extends AppError {
  public readonly detalles: DetalleValidacion[];

  constructor(detalles: DetalleValidacion[]) {
    super('Los datos enviados no son válidos.', 400);
    this.name = 'ErrorValidacion';
    this.detalles = detalles;
  }
}
