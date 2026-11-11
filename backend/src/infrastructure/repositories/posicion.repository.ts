import type { FasePublica } from '../../types/fase';
import type {
  EnfrentamientoJugado,
  EquipoParaTabla,
} from '../../types/posicion';
import { prisma } from '../database';

/** Fases de un torneo, de la última a la primera. */
export const listarFasesDeTorneo = (torneoId: number): Promise<FasePublica[]> =>
  prisma.fase.findMany({
    where: { torneoId },
    orderBy: { orden: 'desc' },
  });

/** Equipos de un torneo con lo necesario para la tabla, en orden de inscripción. */
export const listarEquiposParaTabla = (
  torneoId: number
): Promise<EquipoParaTabla[]> =>
  prisma.equipo.findMany({
    where: { torneoId },
    orderBy: { id: 'asc' },
    select: { id: true, nombre: true, grupo: true, ventajaDesempate: true },
  });

/**
 * Enfrentamientos jugados de una fase: tienen sus dos equipos y un ganador o
 * un marcador cargado. Un empate sin marcador se guarda 0-0, así que también
 * entra. Los pendientes (todo en null) quedan afuera.
 */
export const listarEnfrentamientosJugados = async (
  faseId: number
): Promise<EnfrentamientoJugado[]> => {
  const enfrentamientos = await prisma.enfrentamiento.findMany({
    where: {
      faseId,
      equipoAId: { not: null },
      equipoBId: { not: null },
      OR: [{ ganadorId: { not: null } }, { resultadoA: { not: null } }],
    },
    orderBy: { id: 'asc' },
    select: {
      equipoAId: true,
      equipoBId: true,
      resultadoA: true,
      resultadoB: true,
      ganadorId: true,
    },
  });

  // El filtro asegura que los dos equipos existen; acá se ajusta el tipo.
  return enfrentamientos.map((enfrentamiento) => ({
    ...enfrentamiento,
    equipoAId: enfrentamiento.equipoAId as number,
    equipoBId: enfrentamiento.equipoBId as number,
  }));
};
