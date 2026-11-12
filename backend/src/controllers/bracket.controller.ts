import type { Request, Response } from 'express';
import { obtenerBracket } from '@services/bracket.service';
import { AppError } from '../middlewares/errors/AppError';

/** Id del organizador que carga el middleware autenticar (401 si falta). */
const usuarioIdDe = (req: Request): number => {
  if (req.usuarioId === undefined) {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }
  return req.usuarioId;
};

/**
 * GET /api/torneos/:torneoId/bracket?faseId=
 * Cuadro de una fase de eliminación: rondas de la primera a la final, cada una
 * con sus partidos. Sin faseId usa la fase activa. Responde 200 con { bracket }.
 */
export const obtener = async (req: Request, res: Response): Promise<void> => {
  const { faseId } = req.query;

  const bracket = await obtenerBracket(
    Number(req.params.torneoId),
    usuarioIdDe(req),
    faseId === undefined ? undefined : Number(faseId)
  );

  res.status(200).json({ bracket });
};
