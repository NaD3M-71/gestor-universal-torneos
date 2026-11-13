import { EstadoTorneo } from '@prisma/enums';
import * as faseRepository from '@repositories/fase.repository';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../middlewares/errors/AppError';
import type { FasePublica } from '../types/fase';

const ESTADO_FASE_ACTIVA = 'activa';
const TIPO_FASE_ELIMINACION = 'eliminacion';

/** Mensaje de partidos pendientes, con singular y plural. */
const mensajePendientes = (cantidad: number): string =>
  cantidad === 1
    ? 'Falta 1 partido por jugar: cargá su resultado antes de cerrar la fase.'
    : `Faltan ${cantidad} partidos por jugar: cargá sus resultados antes de cerrar la fase.`;

/**
 * Cuenta los partidos de la fase que todavía no se jugaron. El criterio
 * depende del tipo: en liga y grupos un partido está jugado si tiene ganador o
 * marcador; en eliminación, si el cruce tiene ganador (en ida y vuelta, el de
 * la vuelta).
 */
const contarPendientes = (fase: FasePublica): Promise<number> =>
  fase.tipo === TIPO_FASE_ELIMINACION
    ? faseRepository.contarPendientesDeEliminacion(fase.id)
    : faseRepository.contarPendientesDeLiga(fase.id);

/**
 * Cierra una fase: la pasa a cerrada y, con eso, sus resultados quedan
 * bloqueados (cargarResultado solo acepta fases activas). El torneo tiene que
 * ser del organizador (404 si no) y estar en curso, y la fase tiene que ser de
 * ese torneo (404) y estar activa (409). Con partidos sin jugar no se puede
 * cerrar (409).
 *
 * Esta función solo cierra la fase. Lo que viene después se engancha acá en
 * las otras tarjetas: el chequeo de empates relevantes (6.2) antes de cerrar,
 * y la generación de la fase siguiente (6.4 y 6.5) o el cierre del torneo
 * (6.6) después.
 */
export const cerrarFase = async (
  torneoId: number,
  faseId: number,
  usuarioId: number
): Promise<FasePublica> => {
  const torneo = await obtenerTorneo(torneoId, usuarioId);
  const fase = await faseRepository.buscarFasePorId(faseId);

  if (fase === null || fase.torneoId !== torneoId) {
    throw new AppError('Fase no encontrada.', 404);
  }

  if (torneo.estado !== EstadoTorneo.en_curso) {
    throw new AppError(
      'Solo se puede cerrar una fase de un torneo en curso.',
      409
    );
  }

  if (fase.estado !== ESTADO_FASE_ACTIVA) {
    throw new AppError('La fase ya está cerrada.', 409);
  }

  const pendientes = await contarPendientes(fase);
  if (pendientes > 0) {
    throw new AppError(mensajePendientes(pendientes), 409);
  }

  return faseRepository.cerrarFase(faseId);
};
