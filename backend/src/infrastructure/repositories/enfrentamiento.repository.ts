import type {
  EnfrentamientoConFase,
  EnfrentamientoPublico,
  ResultadoEnfrentamiento,
} from '../../types/enfrentamiento';
import { prisma } from '../database';

// Campos que se devuelven de un enfrentamiento.
const seleccionEnfrentamiento = {
  id: true,
  faseId: true,
  equipoAId: true,
  equipoBId: true,
  resultadoA: true,
  resultadoB: true,
  instancia: true,
  ganadorId: true,
  comentario: true,
} as const;

/** Busca un enfrentamiento con los datos de su fase. Devuelve null si no existe. */
export const buscarEnfrentamientoConFase = (
  id: number
): Promise<EnfrentamientoConFase | null> =>
  prisma.enfrentamiento.findUnique({
    where: { id },
    select: {
      ...seleccionEnfrentamiento,
      fase: { select: { id: true, torneoId: true, tipo: true, estado: true } },
    },
  });

/** Guarda el resultado de un enfrentamiento (carga o corrección). */
export const guardarResultado = (
  id: number,
  resultado: ResultadoEnfrentamiento
): Promise<EnfrentamientoPublico> =>
  prisma.enfrentamiento.update({
    where: { id },
    data: resultado,
    select: seleccionEnfrentamiento,
  });
