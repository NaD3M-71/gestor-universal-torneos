import type { Request, Response } from 'express';
import {
  cargarResultado,
  listarEnfrentamientos,
} from '@services/enfrentamiento.service';
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
 * empate: true, con marcador opcional (resultadoA y resultadoB juntos) y un
 * comentario opcional (por ejemplo, "Ganó X por penales"). En eliminación el
 * ganador es obligatorio. En eliminación a ida y vuelta: la ida lleva solo el
 * marcador (resultadoA y resultadoB, sin ganador ni empate) y la vuelta lleva
 * ganadorId, que es quien avanza en la serie.
 * Responde 200 con { enfrentamiento }.
 */
export const cargar = async (req: Request, res: Response): Promise<void> => {
  const { ganadorId, empate, resultadoA, resultadoB, comentario } = req.body;

  const enfrentamiento = await cargarResultado(
    torneoIdDe(req),
    enfrentamientoIdDe(req),
    usuarioIdDe(req),
    {
      ganadorId: aNumero(ganadorId),
      empate,
      resultadoA: aNumero(resultadoA),
      resultadoB: aNumero(resultadoB),
      comentario,
    }
  );

  res.status(200).json({ enfrentamiento });
};

/**
 * GET /api/torneos/:torneoId/enfrentamientos?faseId=&instancia=
 * Lista los enfrentamientos de una fase, con el nombre de sus equipos y su
 * resultado, en el orden en que se generaron. Sin faseId usa la fase activa;
 * con instancia (ej: fecha_3) trae solo esa fecha o ronda.
 * Responde 200 con { faseId, enfrentamientos }.
 */
export const listar = async (req: Request, res: Response): Promise<void> => {
  const { faseId, instancia } = req.query;

  const listado = await listarEnfrentamientos(
    torneoIdDe(req),
    usuarioIdDe(req),
    faseId === undefined ? undefined : Number(faseId),
    typeof instancia === 'string' ? instancia : undefined
  );

  res.status(200).json(listado);
};
