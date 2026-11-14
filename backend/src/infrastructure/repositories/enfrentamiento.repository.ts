import type { Prisma } from '@prisma/client';
import type { DatosNuevoPartidoBracket } from '../../types/fase';
import type {
  EnfrentamientoConFase,
  EnfrentamientoDeLista,
  EnfrentamientoPublico,
  PromocionAlSiguiente,
  PromocionDeSerie,
  ResultadoEnfrentamiento,
  SiguienteDeSerie,
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
export const buscarEnfrentamientoConFase = async (
  id: number
): Promise<EnfrentamientoConFase | null> => {
  const enfrentamiento = await prisma.enfrentamiento.findUnique({
    where: { id },
    select: {
      ...seleccionEnfrentamiento,
      siguienteId: true,
      vueltaDeId: true,
      // Una ida es el partido al que apunta alguna vuelta.
      _count: { select: { vueltasEnfrentamiento: true } },
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

  if (enfrentamiento === null) {
    return null;
  }

  const { _count, ...datos } = enfrentamiento;
  return { ...datos, tieneVuelta: _count.vueltasEnfrentamiento > 0 };
};

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

const tieneResultado = (partido: {
  resultadoA: number | null;
  resultadoB: number | null;
  ganadorId: number | null;
}): boolean =>
  partido.resultadoA !== null ||
  partido.resultadoB !== null ||
  partido.ganadorId !== null;

/**
 * Cruce siguiente de una eliminatoria a ida y vuelta, a partir de su ida (a la
 * que apunta la vuelta del cruce anterior). Devuelve null si no existe o no
 * tiene vuelta.
 */
export const buscarSiguienteDeSerie = async (
  idaId: number
): Promise<SiguienteDeSerie | null> => {
  const seleccionResultado = {
    id: true,
    resultadoA: true,
    resultadoB: true,
    ganadorId: true,
  } as const;

  const ida = await prisma.enfrentamiento.findUnique({
    where: { id: idaId },
    select: {
      ...seleccionResultado,
      previosEnfrentamientos: { select: { id: true }, orderBy: { id: 'asc' } },
      vueltasEnfrentamiento: { select: seleccionResultado, take: 1 },
    },
  });
  const vuelta = ida?.vueltasEnfrentamiento[0];

  if (ida === null || vuelta === undefined) {
    return null;
  }

  return {
    idaId: ida.id,
    vueltaId: vuelta.id,
    alimentadoresIds: ida.previosEnfrentamientos.map((previo) => previo.id),
    jugado: tieneResultado(ida) || tieneResultado(vuelta),
  };
};

/**
 * Guarda el resultado de una vuelta y, en la misma transacción, ubica al
 * equipo que avanza en el cruce siguiente: en la ida del lado indicado y en la
 * vuelta del lado contrario.
 */
export const guardarResultadoConPromocionDeSerie = async (
  id: number,
  resultado: ResultadoEnfrentamiento,
  promocion: PromocionDeSerie
): Promise<EnfrentamientoPublico> => {
  const { idaId, vueltaId, lado, equipoId } = promocion;

  const [enfrentamiento] = await prisma.$transaction([
    prisma.enfrentamiento.update({
      where: { id },
      data: resultado,
      select: seleccionEnfrentamiento,
    }),
    prisma.enfrentamiento.update({
      where: { id: idaId },
      data: lado === 'A' ? { equipoAId: equipoId } : { equipoBId: equipoId },
    }),
    prisma.enfrentamiento.update({
      where: { id: vueltaId },
      data: lado === 'A' ? { equipoBId: equipoId } : { equipoAId: equipoId },
    }),
  ]);

  return enfrentamiento;
};

/**
 * Enfrentamientos de una fase con el nombre de sus equipos, en el orden en que
 * se generaron (para una liga, fecha por fecha). Con instancia (ej: fecha_3)
 * trae solo los de esa instancia.
 */
export const listarEnfrentamientosDeFase = (
  faseId: number,
  instancia?: string
): Promise<EnfrentamientoDeLista[]> =>
  prisma.enfrentamiento.findMany({
    where: { faseId, ...(instancia === undefined ? {} : { instancia }) },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      faseId: true,
      instancia: true,
      resultadoA: true,
      resultadoB: true,
      ganadorId: true,
      comentario: true,
      equipoA: { select: { id: true, nombre: true } },
      equipoB: { select: { id: true, nombre: true } },
    },
  });

/**
 * Guarda el cuadro de una eliminatoria dentro de una transacción ya abierta:
 * los partidos encadenados por siguienteId y, en ida y vuelta, cada vuelta
 * enlazada a su ida con vueltaDeId. Se guarda de la final hacia la primera
 * ronda, así cuando se crea un partido el que sigue ya tiene id. Dentro de cada
 * ronda se mantiene el orden: de cada par, el de menor id es el que entra como
 * equipo A al partido siguiente (el de mayor id entra como B). En ida y vuelta
 * la ida tiene menor indice que su vuelta, así que ya existe cuando se la
 * enlaza.
 */
export const guardarPartidosDeBracket = async (
  tx: Prisma.TransactionClient,
  faseId: number,
  partidos: DatosNuevoPartidoBracket[]
): Promise<void> => {
  const orden = [...partidos].sort(
    (a, b) => b.ronda - a.ronda || a.indice - b.indice
  );
  const idPorIndice = new Map<number, number>();

  for (const partido of orden) {
    const creado = await tx.enfrentamiento.create({
      data: {
        faseId,
        equipoAId: partido.equipoAId,
        equipoBId: partido.equipoBId,
        ganadorId: partido.ganadorId,
        instancia: partido.instancia,
        siguienteId:
          partido.siguienteIndice === null
            ? null
            : (idPorIndice.get(partido.siguienteIndice) ?? null),
        vueltaDeId:
          partido.vueltaDeIndice === undefined ||
          partido.vueltaDeIndice === null
            ? null
            : (idPorIndice.get(partido.vueltaDeIndice) ?? null),
      },
      select: { id: true },
    });
    idPorIndice.set(partido.indice, creado.id);
  }
};
