import type {
  DatosActualizarEquipo,
  DatosNuevoEquipo,
  EquipoPublico,
} from '../../types/equipo';
import { prisma } from '../database';

// Campos que se devuelven de un equipo, con sus integrantes en orden de alta.
const seleccionEquipo = {
  id: true,
  torneoId: true,
  nombre: true,
  integrantes: { select: { id: true, nombre: true }, orderBy: { id: 'asc' } },
} as const;

/** Guarda un equipo del torneo junto con sus integrantes, en una sola operación. */
export const crearEquipo = (
  torneoId: number,
  datos: DatosNuevoEquipo
): Promise<EquipoPublico> =>
  prisma.equipo.create({
    data: {
      torneoId,
      nombre: datos.nombre,
      integrantes: {
        create: (datos.integrantes ?? []).map((nombre) => ({ nombre })),
      },
    },
    select: seleccionEquipo,
  });

/** Equipos de un torneo, en orden de inscripción. */
export const listarEquiposDeTorneo = (
  torneoId: number
): Promise<EquipoPublico[]> =>
  prisma.equipo.findMany({
    where: { torneoId },
    orderBy: { id: 'asc' },
    select: seleccionEquipo,
  });

/** Busca un equipo por id. Devuelve null si no existe. */
export const buscarEquipoPorId = (id: number): Promise<EquipoPublico | null> =>
  prisma.equipo.findUnique({ where: { id }, select: seleccionEquipo });

/**
 * Aplica los cambios recibidos. Si vienen integrantes, se borran los actuales y
 * se crean los nuevos dentro de la misma operación, así nunca queda a medias.
 */
export const actualizarEquipo = (
  id: number,
  datos: DatosActualizarEquipo
): Promise<EquipoPublico> =>
  prisma.equipo.update({
    where: { id },
    data: {
      ...(datos.nombre !== undefined && { nombre: datos.nombre }),
      ...(datos.integrantes !== undefined && {
        integrantes: {
          deleteMany: {},
          create: datos.integrantes.map((nombre) => ({ nombre })),
        },
      }),
    },
    select: seleccionEquipo,
  });

/** Borra un equipo; la base elimina en cascada a sus integrantes. */
export const eliminarEquipo = async (id: number): Promise<void> => {
  await prisma.equipo.delete({ where: { id } });
};

/** Cantidad de equipos ya inscriptos en un torneo. */
export const contarEquiposDeTorneo = (torneoId: number): Promise<number> =>
  prisma.equipo.count({ where: { torneoId } });

/**
 * Indica si el torneo ya tiene un equipo con ese nombre, sin distinguir
 * mayúsculas. Con excluirEquipoId se ignora a ese equipo (para editarlo).
 */
export const existeEquipoConNombre = async (
  torneoId: number,
  nombre: string,
  excluirEquipoId?: number
): Promise<boolean> => {
  const equipo = await prisma.equipo.findFirst({
    where: {
      torneoId,
      nombre: { equals: nombre, mode: 'insensitive' },
      ...(excluirEquipoId !== undefined && { id: { not: excluirEquipoId } }),
    },
    select: { id: true },
  });

  return equipo !== null;
};
