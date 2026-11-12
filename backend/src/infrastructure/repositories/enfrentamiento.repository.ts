import type {
  EnfrentamientoConFase,
  EnfrentamientoPublico,
  PromocionAlSiguiente,
  ResultadoEnfrentamiento,
  SiguienteEnfrentamiento,
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
      siguienteId: true,
      fase: {
        select: {
          id: true,
          torneoId: true,
          tipo: true,
          estado: true,
          idaYVuelta: true,
        },
      },
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

/**
 * Partido siguiente de una eliminatoria, con los ids de los partidos que lo
 * alimentan (de menor a mayor). Devuelve null si no existe.
 */
export const buscarSiguiente = async (
  id: number
): Promise<SiguienteEnfrentamiento | null> => {
  const siguiente = await prisma.enfrentamiento.findUnique({
    where: { id },
    select: {
      id: true,
      ganadorId: true,
      previosEnfrentamientos: {
        select: { id: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (siguiente === null) {
    return null;
  }

  return {
    id: siguiente.id,
    ganadorId: siguiente.ganadorId,
    alimentadoresIds: siguiente.previosEnfrentamientos.map(
      (previo) => previo.id
    ),
  };
};

/**
 * Guarda el resultado de un enfrentamiento y, en la misma transacción, ubica
 * al ganador en el partido siguiente (como equipo A o B según el lado).
 */
export const guardarResultadoConPromocion = async (
  id: number,
  resultado: ResultadoEnfrentamiento,
  promocion: PromocionAlSiguiente
): Promise<EnfrentamientoPublico> => {
  const [enfrentamiento] = await prisma.$transaction([
    prisma.enfrentamiento.update({
      where: { id },
      data: resultado,
      select: seleccionEnfrentamiento,
    }),
    prisma.enfrentamiento.update({
      where: { id: promocion.siguienteId },
      data:
        promocion.lado === 'A'
          ? { equipoAId: promocion.equipoId }
          : { equipoBId: promocion.equipoId },
    }),
  ]);

  return enfrentamiento;
};
