import type {
  DatosActualizarTorneo,
  DatosNuevoTorneo,
  TorneoPublico,
} from '../../types/torneo';
import type { DatosNuevaFase, TorneoIniciado } from '../../types/fase';
import { prisma } from '../database';
import { EstadoTorneo } from '@prisma/enums';

/**
 * Guarda un torneo nuevo. El estado no se envía: la base lo deja en borrador.
 * Los DTO de types/torneo.ts tienen los mismos nombres de campo que el modelo
 * de Prisma, por eso se pasan directo como data.
 */
export const crearTorneo = (datos: DatosNuevoTorneo): Promise<TorneoPublico> =>
  prisma.torneo.create({ data: datos });

/** Torneos de un organizador, del más nuevo al más viejo. */
export const listarTorneosDeCreador = (
  creadorId: number
): Promise<TorneoPublico[]> =>
  prisma.torneo.findMany({
    where: { creadorId },
    orderBy: { id: 'desc' },
    include: {
      campeon: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

/** Busca un torneo por id. Devuelve null si no existe. */
export const buscarTorneoPorId = (id: number): Promise<TorneoPublico | null> =>
  prisma.torneo.findUnique({
    where: { id },
    include: {
      campeon: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

/** Aplica los cambios recibidos (parciales) y devuelve el torneo actualizado. */
export const actualizarTorneo = (
  id: number,
  datos: DatosActualizarTorneo
): Promise<TorneoPublico> =>
  prisma.torneo.update({ where: { id }, data: datos });

/** Cambia el estado de un torneo. */
export const cambiarEstadoTorneo = (
  id: number,
  estado: EstadoTorneo
): Promise<TorneoPublico> =>
  prisma.torneo.update({ where: { id }, data: { estado } });

/**
 * Inicia un torneo: lo pasa a en_curso, fija la cantidad real de participantes
 * y crea su primera fase. Todo en una transacción, así no queda a medias.
 */
export const iniciarTorneo = async (
  id: number,
  cantidadParticipantes: number,
  fase: DatosNuevaFase
): Promise<TorneoIniciado> => {
  const [torneo, faseCreada] = await prisma.$transaction([
    prisma.torneo.update({
      where: { id },
      data: { estado: EstadoTorneo.en_curso, cantidadParticipantes },
    }),
    prisma.fase.create({ data: { torneoId: id, ...fase } }),
  ]);

  return { torneo, fase: faseCreada };
};

/**
 * Borra un torneo. La base elimina en cascada sus fases y sus equipos (y con
 * ellos los integrantes y enfrentamientos).
 */
export const eliminarTorneo = async (id: number): Promise<void> => {
  await prisma.torneo.delete({ where: { id } });
};
