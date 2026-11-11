import type { Request, Response } from 'express';
import { obtenerPosiciones } from '@services/posicion.service';
import { AppError } from '../middlewares/errors/AppError';

/** Id del organizador que carga el middleware autenticar (401 si falta). */
const usuarioIdDe = (req: Request): number => {
  if (req.usuarioId === undefined) {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }
  return req.usuarioId;
};

/**
 * GET /api/torneos/:torneoId/posiciones?faseId=
 * Tabla de posiciones de una fase de liga o grupos, calculada en el momento.
 * Sin faseId usa la fase activa. Responde 200 con { tabla }.
 */
export const obtener = async (req: Request, res: Response): Promise<void> => {
  const { faseId } = req.query;

  const tabla = await obtenerPosiciones(
    Number(req.params.torneoId),
    usuarioIdDe(req),
    faseId === undefined ? undefined : Number(faseId)
  );

  res.status(200).json({ tabla });
};
