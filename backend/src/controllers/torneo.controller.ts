import type { Request, Response } from 'express';
import {
  actualizarTorneo,
  cancelarTorneo,
  crearTorneo,
  eliminarTorneo,
  iniciarTorneo,
  listarTorneos,
  obtenerTorneo,
} from '@services/torneo.service';
import type { DatosActualizarTorneo } from '../types/torneo';
import { AppError } from '../middlewares/errors/AppError';

// Campos que el organizador puede modificar. El estado y el campeón no están:
// los cambia la lógica de inicio y cierre del torneo.
const CAMPOS_EDITABLES = [
  'nombre',
  'descripcion',
  'formato',
  'sistemaPuntuacion',
  'cantidadParticipantes',
  'cantidadGrupos',
  'fechaInicio',
] as const;

/** Id del organizador que carga el middleware autenticar (401 si falta). */
const usuarioIdDe = (req: Request): number => {
  if (req.usuarioId === undefined) {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }
  return req.usuarioId;
};

/** Id del torneo de la URL; ya pasó validarIdTorneo. */
const torneoIdDe = (req: Request): number => Number(req.params.id);

/**
 * POST /api/torneos
 * Crea un torneo en borrador del organizador y responde 201 con el torneo.
 */
export const crear = async (req: Request, res: Response): Promise<void> => {
  const {
    nombre,
    descripcion,
    formato,
    sistemaPuntuacion,
    cantidadParticipantes,
    cantidadGrupos,
    fechaInicio,
  } = req.body;

  const torneo = await crearTorneo({
    creadorId: usuarioIdDe(req),
    nombre,
    descripcion,
    formato,
    sistemaPuntuacion,
    cantidadParticipantes,
    cantidadGrupos,
    fechaInicio,
  });

  res.status(201).json({ torneo });
};

/** GET /api/torneos: los torneos del organizador, del más nuevo al más viejo. */
export const listar = async (req: Request, res: Response): Promise<void> => {
  const torneos = await listarTorneos(usuarioIdDe(req));

  res.status(200).json({ torneos });
};

/** GET /api/torneos/:id: detalle de un torneo del organizador. */
export const obtener = async (req: Request, res: Response): Promise<void> => {
  const torneo = await obtenerTorneo(torneoIdDe(req), usuarioIdDe(req));

  res.status(200).json({ torneo });
};

/**
 * PATCH /api/torneos/:id
 * Edita un torneo en borrador. Solo se toman los campos editables que vengan
 * en el cuerpo; el resto se ignora.
 */
export const actualizar = async (
  req: Request,
  res: Response
): Promise<void> => {
  const cambios = Object.fromEntries(
    CAMPOS_EDITABLES.filter((campo) => req.body[campo] !== undefined).map(
      (campo) => [campo, req.body[campo]]
    )
  ) as DatosActualizarTorneo;

  const torneo = await actualizarTorneo(
    torneoIdDe(req),
    usuarioIdDe(req),
    cambios
  );

  res.status(200).json({ torneo });
};

/** DELETE /api/torneos/:id: borra un torneo en borrador y responde 204. */
export const eliminar = async (req: Request, res: Response): Promise<void> => {
  await eliminarTorneo(torneoIdDe(req), usuarioIdDe(req));

  res.status(204).end();
};

/**
 * PATCH /api/torneos/:id/cancelar
 * Cambia el estado de un torneo a cancelado.
 */
export const cancelar = async (req: Request, res: Response): Promise<void> => {
  const torneo = await cancelarTorneo(torneoIdDe(req), usuarioIdDe(req));

  res.status(200).json({ torneo });
};

/**
 * PATCH /api/torneos/:id/iniciar
 * Inicia el torneo y crea su primera fase. Responde 200 con { torneo, fase }.
 */
export const iniciar = async (req: Request, res: Response): Promise<void> => {
  const { torneo, fase } = await iniciarTorneo(
    torneoIdDe(req),
    usuarioIdDe(req)
  );

  res.status(200).json({ torneo, fase });
};
