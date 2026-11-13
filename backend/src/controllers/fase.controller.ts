import type { Request, Response } from 'express';
import { cerrarFase } from '@services/fase.service';
import { AppError } from '../middlewares/errors/AppError';

/** Id del organizador que carga el middleware autenticar (401 si falta). */
const usuarioIdDe = (req: Request): number => {
  if (req.usuarioId === undefined) {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }
  return req.usuarioId;
};

/**
 * PATCH /api/torneos/:torneoId/fases/:faseId/cerrar
 * Cierra una fase (sin cuerpo): sus resultados quedan bloqueados. Solo se puede
 * con todos los partidos jugados. Responde 200 con { fase } ya cerrada.
 */
export const cerrar = async (req: Request, res: Response): Promise<void> => {
  const fase = await cerrarFase(
    Number(req.params.torneoId),
    Number(req.params.faseId),
    usuarioIdDe(req)
  );

  res.status(200).json({ fase });
};
