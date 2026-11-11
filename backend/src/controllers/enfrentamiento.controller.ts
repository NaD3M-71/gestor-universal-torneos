import type { Request, Response } from 'express';
import { cargarResultado } from '@services/enfrentamientos/enfrentamiento.service';
import { AppError } from '../middlewares/errors/AppError';

/** Id del organizador que carga el middleware autenticar (401 si falta). */
const usuarioIdDe = (req: Request): number => {
  if (req.usuarioId === undefined) {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }
  return req.usuarioId;
};

/** Ids de la URL; ya pasaron las validaciones de la ruta. */
const torneoIdDe = (req: Request): number => Number(req.params.torneoId);
const enfrentamientoIdDe = (req: Request): number => Number(req.params.id);

/** Convierte un valor numérico opcional del cuerpo (ya validado) a number. */
const aNumero = (valor: unknown): number | undefined =>
  valor === undefined ? undefined : Number(valor);

/**
 * PUT /api/torneos/:torneoId/enfrentamientos/:id/resultado
 * Carga o corrige el resultado de un enfrentamiento: un ganador (ganadorId) o
 * empate: true, con marcador opcional (resultadoA y resultadoB juntos).
 * Responde 200 con { enfrentamiento }.
 */
export const cargar = async (req: Request, res: Response): Promise<void> => {
  const { ganadorId, empate, resultadoA, resultadoB } = req.body;

  const enfrentamiento = await cargarResultado(
    torneoIdDe(req),
    enfrentamientoIdDe(req),
    usuarioIdDe(req),
    {
      ganadorId: aNumero(ganadorId),
      empate,
      resultadoA: aNumero(resultadoA),
      resultadoB: aNumero(resultadoB),
    }
  );

  res.status(200).json({ enfrentamiento });
};
