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
import { guardarPartidosDeBracket } from './enfrentamiento.repository';
import { EstadoTorneo } from '@prisma/enums';

/** Estado con el que nace toda fase: pasa a activa cuando empieza a jugarse. */
const ESTADO_FASE_PENDIENTE = 'pendiente';
const ESTADO_FASE_ACTIVA = 'activa';

/** Trae las fases del torneo, de la primera a la última. */
const INCLUIR_FASES = { fases: { orderBy: { orden: 'asc' } } } as const;

/** Las fases nuevas nacen pendientes. */
const comoPendientes = (fases: DatosNuevaFase[]) =>
  fases.map((fase) => ({ ...fase, estado: ESTADO_FASE_PENDIENTE }));

/**
 * Guarda un torneo nuevo junto con sus fases (todas pendientes), en una sola
 * operación. El estado del torneo no se envía: la base lo deja en borrador.
 * Los campos de types/torneo.ts tienen los mismos nombres que el modelo de
 * Prisma, por eso se pasan directo como data. La línea de corte y la ida y
 * vuelta no son columnas del torneo: viajan dentro de las fases.
 */
export const crearTorneo = (
  datos: Omit<DatosNuevoTorneo, 'lineaDeCorte' | 'idaYVuelta'>,
  fases: DatosNuevaFase[]
): Promise<TorneoPublico> =>
  prisma.torneo.create({
    data: { ...datos, fases: { create: comoPendientes(fases) } },
    include: INCLUIR_FASES,
  });

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
      ...INCLUIR_FASES,
    },
  });

/**
 * Aplica los cambios recibidos (parciales) y devuelve el torneo actualizado.
 * Si vienen fases, reemplaza todas las del torneo por esas (nuevas y
 * pendientes) en la misma operación: solo se usa con el torneo en borrador,
 * cuando las fases todavía no tienen enfrentamientos.
 */
export const actualizarTorneo = (
  id: number,
  datos: Omit<DatosActualizarTorneo, 'lineaDeCorte' | 'idaYVuelta'>,
  fases?: DatosNuevaFase[]
): Promise<TorneoPublico> =>
  prisma.torneo.update({
    where: { id },
    data:
      fases === undefined
        ? datos
        : {
            ...datos,
            fases: { deleteMany: {}, create: comoPendientes(fases) },
          },
    include: INCLUIR_FASES,
  });

/** Cambia el estado de un torneo. */
export const cambiarEstadoTorneo = (
  id: number,
  estado: EstadoTorneo
): Promise<TorneoPublico> =>
  prisma.torneo.update({ where: { id }, data: { estado } });

/**
 * Inicia un torneo: lo pasa a en_curso, fija la cantidad real de participantes
 * y activa su primera fase (que ya existe, pendiente) junto con la creación de
 * sus enfrentamientos (si los hay). Todo en una transacción, así no queda a
 * medias.
 */
export const iniciarTorneo = async (
  id: number,
  cantidadParticipantes: number,
  faseId: number,
  enfrentamientos: DatosNuevoEnfrentamiento[] = []
): Promise<TorneoIniciado> => {
  const [torneo, faseActivada] = await prisma.$transaction([
    prisma.torneo.update({
      where: { id },
      data: { estado: EstadoTorneo.en_curso, cantidadParticipantes },
    }),
    // Los enfrentamientos se crean anidados en la fase, que les pone su faseId.
    prisma.fase.update({
      where: { id: faseId },
      data: {
        estado: ESTADO_FASE_ACTIVA,
        enfrentamientos: { create: enfrentamientos },
      },
    }),
  ]);

  return { torneo, fase: faseActivada };
};

/**
 * Inicia un torneo cuya primera fase es una eliminatoria: igual que
 * iniciarTorneo, pero guarda el cuadro completo (todas las rondas) con los
 * partidos encadenados (ver guardarPartidosDeBracket). Todo en una transacción.
 */
export const iniciarTorneoConBracket = (
  id: number,
  cantidadParticipantes: number,
  faseId: number,
  partidos: DatosNuevoPartidoBracket[]
): Promise<TorneoIniciado> =>
  prisma.$transaction(async (tx) => {
    const torneo = await tx.torneo.update({
      where: { id },
      data: { estado: EstadoTorneo.en_curso, cantidadParticipantes },
    });
    const faseCreada = await tx.fase.update({
      where: { id: faseId },
      data: { estado: ESTADO_FASE_ACTIVA },
    });

    await guardarPartidosDeBracket(tx, faseCreada.id, partidos);

    return { torneo, fase: faseCreada };
  });

/**
 * Borra un torneo. La base elimina en cascada sus fases y sus equipos (y con
 * ellos los integrantes y enfrentamientos).
 */
export const eliminarTorneo = async (id: number): Promise<void> => {
  await prisma.torneo.delete({ where: { id } });
};
