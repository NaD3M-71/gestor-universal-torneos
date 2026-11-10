import type { Request, Response } from 'express';
import {
  actualizarEquipo,
  asignarGrupos,
  crearEquipo,
  eliminarEquipo,
  listarEquipos,
  sortearGrupos,
} from '@services/equipos/equipo.service';
import { AppError } from '../middlewares/errors/AppError';
import type { AsignacionGrupo, DatosActualizarEquipo } from '../types/equipo';

// Campos que el organizador puede modificar de un equipo.
const CAMPOS_EDITABLES = ['nombre', 'integrantes'] as const;

/** Id del organizador que carga el middleware autenticar (401 si falta). */
const usuarioIdDe = (req: Request): number => {
  if (req.usuarioId === undefined) {
    throw new AppError('Necesitás iniciar sesión.', 401);
  }
  return req.usuarioId;
};

/** Ids de la URL; ya pasaron las validaciones de la ruta. */
const torneoIdDe = (req: Request): number => Number(req.params.torneoId);
const equipoIdDe = (req: Request): number => Number(req.params.id);

/**
 * POST /api/torneos/:torneoId/equipos
 * Inscribe un equipo (con sus integrantes, opcionales) y responde 201.
 */
export const crear = async (req: Request, res: Response): Promise<void> => {
  const { nombre, integrantes } = req.body;

  const equipo = await crearEquipo(torneoIdDe(req), usuarioIdDe(req), {
    nombre,
    integrantes,
  });

  res.status(201).json({ equipo });
};

/** GET /api/torneos/:torneoId/equipos: equipos del torneo con sus integrantes. */
export const listar = async (req: Request, res: Response): Promise<void> => {
  const equipos = await listarEquipos(torneoIdDe(req), usuarioIdDe(req));

  res.status(200).json({ equipos });
};

/**
 * PATCH /api/torneos/:torneoId/equipos/:id
 * Edita un equipo. Solo se toman los campos editables que vengan en el cuerpo.
 */
export const actualizar = async (
  req: Request,
  res: Response
): Promise<void> => {
  const cambios = Object.fromEntries(
    CAMPOS_EDITABLES.filter((campo) => req.body[campo] !== undefined).map(
      (campo) => [campo, req.body[campo]]
    )
  ) as DatosActualizarEquipo;

  const equipo = await actualizarEquipo(
    torneoIdDe(req),
    equipoIdDe(req),
    usuarioIdDe(req),
    cambios
  );

  res.status(200).json({ equipo });
};

/** DELETE /api/torneos/:torneoId/equipos/:id: borra el equipo y responde 204. */
export const eliminar = async (req: Request, res: Response): Promise<void> => {
  await eliminarEquipo(torneoIdDe(req), equipoIdDe(req), usuarioIdDe(req));

  res.status(204).end();
};

/**
 * PUT /api/torneos/:torneoId/grupos
 * Reemplaza la asignación de grupos de todo el torneo.
 */
export const asignarGruposDelTorneo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const asignaciones = (req.body.asignaciones as AsignacionGrupo[]).map(
    ({ equipoId, grupo }) => ({ equipoId: Number(equipoId), grupo })
  );

  const equipos = await asignarGrupos(
    torneoIdDe(req),
    usuarioIdDe(req),
    asignaciones
  );

  res.status(200).json({ equipos });
};

/** POST /api/torneos/:torneoId/grupos/sorteo: reparte los equipos al azar. */
export const sortearGruposDelTorneo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const equipos = await sortearGrupos(torneoIdDe(req), usuarioIdDe(req));

  res.status(200).json({ equipos });
};
