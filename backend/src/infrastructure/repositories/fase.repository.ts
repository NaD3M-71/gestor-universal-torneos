import type { FasePublica } from '../../types/fase';
import { prisma } from '../database';

/** Busca una fase por id. Devuelve null si no existe. */
export const buscarFasePorId = (id: number): Promise<FasePublica | null> =>
  prisma.fase.findUnique({ where: { id } });

/**
 * Cuenta los partidos de una fase de liga o grupos que todavía no se jugaron:
 * los que no tienen ganador ni marcador. Un empate sin marcador se guarda 0-0,
 * así que ya no entra acá.
 */
export const contarPendientesDeLiga = (faseId: number): Promise<number> =>
  prisma.enfrentamiento.count({
    where: { faseId, ganadorId: null, resultadoA: null },
  });

/**
 * Cuenta los cruces de una fase de eliminación que todavía no tienen ganador.
 * Los byes ya nacen con ganador. En ida y vuelta se excluyen las idas (las que
 * tienen alguna vuelta apuntándoles): solo la vuelta define quién avanza, y la
 * ida puede quedar sin marcador.
 */
export const contarPendientesDeEliminacion = (
  faseId: number
): Promise<number> =>
  prisma.enfrentamiento.count({
    where: {
      faseId,
      ganadorId: null,
      vueltasEnfrentamiento: { none: {} },
    },
  });

/** Pasa una fase a cerrada: desde ahí sus resultados quedan bloqueados. */
export const cerrarFase = (id: number): Promise<FasePublica> =>
  prisma.fase.update({ where: { id }, data: { estado: 'cerrada' } });
