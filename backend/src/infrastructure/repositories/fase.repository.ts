import type { DatosNuevoPartidoBracket, FasePublica } from '../../types/fase';
import { prisma } from '../database';
import { guardarPartidosDeBracket } from './enfrentamiento.repository';

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

/**
 * Guarda el desempate de una fase en una sola transacción: la ventaja de cada
 * equipo y, si viene, el comentario de la fase (null lo borra). Devuelve la
 * fase actualizada.
 */
export const guardarDesempate = async (
  faseId: number,
  ventajas: { equipoId: number; ventajaDesempate: number }[],
  comentario?: string | null
): Promise<FasePublica> => {
  const [fase] = await prisma.$transaction([
    prisma.fase.update({
      where: { id: faseId },
      data: comentario === undefined ? {} : { comentarioDesempate: comentario },
    }),
    ...ventajas.map(({ equipoId, ventajaDesempate }) =>
      prisma.equipo.update({
        where: { id: equipoId },
        data: { ventajaDesempate },
      })
    ),
  ]);
  return fase;
};

/** Busca la fase de un torneo que ocupa un lugar del orden. Null si no hay. */
export const buscarFasePorOrden = (
  torneoId: number,
  orden: number
): Promise<FasePublica | null> =>
  prisma.fase.findFirst({ where: { torneoId, orden } });

/**
 * Cierra una fase y arma la siguiente en una sola transacción: la siguiente
 * pasa a activa y se guarda su cuadro de eliminación. Si algo falla no queda
 * nada a medias (la fase no se cierra sin su fase siguiente).
 */
export const cerrarFaseYActivarSiguiente = (
  faseId: number,
  siguienteId: number,
  partidos: DatosNuevoPartidoBracket[]
): Promise<{ fase: FasePublica; faseSiguiente: FasePublica }> =>
  prisma.$transaction(async (tx) => {
    const fase = await tx.fase.update({
      where: { id: faseId },
      data: { estado: 'cerrada' },
    });
    const faseSiguiente = await tx.fase.update({
      where: { id: siguienteId },
      data: { estado: 'activa' },
    });
    await guardarPartidosDeBracket(tx, siguienteId, partidos);
    return { fase, faseSiguiente };
  });
