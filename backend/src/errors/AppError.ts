/**
 * Error esperado de la aplicación, con el código HTTP que debe devolver la API.
 * Los controladores y servicios lo lanzan (por ejemplo, 404 si un torneo no
 * existe) y el middleware de errores lo convierte en la respuesta.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(mensaje: string, statusCode: number = 500) {
    super(mensaje);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}