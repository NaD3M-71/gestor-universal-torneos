import type { Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Indica que el servidor está levantado y respondiendo. No consulta la base
 * de datos: sirve para saber si el proceso está vivo.
 */
export const obtenerEstado = (_req: Request, res: Response): void => {
  res.status(200).json({
    estado: 'ok',
    entorno: env.NODE_ENV,
    uptime: Math.round(process.uptime()),
    fecha: new Date().toISOString(),
  });
};