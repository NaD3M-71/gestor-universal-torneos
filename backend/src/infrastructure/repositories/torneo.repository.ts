import type {
  DatosActualizarTorneo,
  DatosNuevoTorneo,
  TorneoPublico,
} from '../../types/torneo';
import type {
  DatosNuevaFase,
  DatosNuevoEnfrentamiento,
  DatosNuevoPartidoBracket,
  TorneoIniciado,
} from '../../types/fase';
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
 * y crea su primera fase junto con sus enfrentamientos (si los hay). Todo en
 * una transacción, así no queda a medias.
 */
export const iniciarTorneo = async (
  id: number,
  cantidadParticipantes: number,
  fase: DatosNuevaFase,
  enfrentamientos: DatosNuevoEnfrentamiento[] = []
): Promise<TorneoIniciado> => {
  const [torneo, faseCreada] = await prisma.$transaction([
    prisma.torneo.update({
      where: { id },
      data: { estado: EstadoTorneo.en_curso, cantidadParticipantes },
    }),
    // Los enfrentamientos se crean anidados en la fase, que les pone su faseId.
    prisma.fase.create({
      data: {
        torneoId: id,
        ...fase,
        enfrentamientos: { create: enfrentamientos },
      },
    }),
  ]);

  return { torneo, fase: faseCreada };
};

/**
 * Inicia un torneo cuya primera fase es una eliminatoria: igual que
 * iniciarTorneo, pero guarda el cuadro completo (todas las rondas) con los
 * partidos encadenados por siguienteId. Todo en una transacción.
 */
export const iniciarTorneoConBracket = (
  id: number,
  cantidadParticipantes: number,
  fase: DatosNuevaFase,
  partidos: DatosNuevoPartidoBracket[]
): Promise<TorneoIniciado> =>
  prisma.$transaction(async (tx) => {
    const torneo = await tx.torneo.update({
      where: { id },
      data: { estado: EstadoTorneo.en_curso, cantidadParticipantes },
    });
    const faseCreada = await tx.fase.create({
      data: { torneoId: id, ...fase },
    });

    // Se guarda de la final hacia la primera ronda, así cuando se crea un
    // partido el que sigue ya tiene id. Dentro de cada ronda se mantiene el
    // orden: de cada par, el de menor id es el que entra como equipo A al
    // partido siguiente (el de mayor id entra como B).
    const orden = [...partidos].sort(
      (a, b) => b.ronda - a.ronda || a.indice - b.indice
    );
    const idPorIndice = new Map<number, number>();

    for (const partido of orden) {
      const creado = await tx.enfrentamiento.create({
        data: {
          faseId: faseCreada.id,
          equipoAId: partido.equipoAId,
          equipoBId: partido.equipoBId,
          ganadorId: partido.ganadorId,
          instancia: partido.instancia,
          siguienteId:
            partido.siguienteIndice === null
              ? null
              : (idPorIndice.get(partido.siguienteIndice) ?? null),
        },
        select: { id: true },
      });
      idPorIndice.set(partido.indice, creado.id);
    }

    return { torneo, fase: faseCreada };
  });

/**
 * Borra un torneo. La base elimina en cascada sus fases y sus equipos (y con
 * ellos los integrantes y enfrentamientos).
 */
export const eliminarTorneo = async (id: number): Promise<void> => {
  await prisma.torneo.delete({ where: { id } });
};
