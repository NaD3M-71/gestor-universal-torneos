import type { EnfrentamientoDeBracket } from '../../types/bracket';
import { prisma } from '../database';

/** Enfrentamientos de una fase con el nombre de sus equipos, en orden de creación. */
export const listarEnfrentamientosDeFase = (
  faseId: number
): Promise<EnfrentamientoDeBracket[]> =>
  prisma.enfrentamiento.findMany({
    where: { faseId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      instancia: true,
      siguienteId: true,
      resultadoA: true,
      resultadoB: true,
      ganadorId: true,
      equipoA: { select: { id: true, nombre: true } },
      equipoB: { select: { id: true, nombre: true } },
    },
  });
