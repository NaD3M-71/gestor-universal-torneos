import { EstadoTorneo } from '@prisma/enums';
import * as equipoRepository from '@repositories/equipo.repository';
import { obtenerTorneo } from '@services/torneos/torneo.service';
import { AppError } from '../../middlewares/errors/AppError';
import type {
  DatosActualizarEquipo,
  DatosNuevoEquipo,
  EquipoPublico,
} from '../../types/equipo';
import type { TorneoPublico } from '../../types/torneo';

/**
 * Torneo del organizador (404 si no existe o es de otro) en el que se pueden
 * tocar los equipos. Solo se puede mientras está en borrador.
 */
const buscarTorneoEditable = async (
  torneoId: number,
  usuarioId: number
): Promise<TorneoPublico> => {
  const torneo = await obtenerTorneo(torneoId, usuarioId);

  if (torneo.estado !== EstadoTorneo.borrador) {
    throw new AppError(
      'Solo se pueden modificar los equipos de un torneo en borrador.',
      409
    );
  }

  return torneo;
};

/** Busca un equipo y comprueba que pertenezca al torneo de la URL. */
const buscarEquipoDelTorneo = async (
  torneoId: number,
  equipoId: number
): Promise<EquipoPublico> => {
  const equipo = await equipoRepository.buscarEquipoPorId(equipoId);

  if (equipo === null || equipo.torneoId !== torneoId) {
    throw new AppError('Equipo no encontrado.', 404);
  }

  return equipo;
};

/** Dos equipos del mismo torneo no pueden llamarse igual (sin distinguir mayúsculas). */
const exigirNombreLibre = async (
  torneoId: number,
  nombre: string,
  excluirEquipoId?: number
): Promise<void> => {
  if (
    await equipoRepository.existeEquipoConNombre(
      torneoId,
      nombre,
      excluirEquipoId
    )
  ) {
    throw new AppError('Ya hay un equipo con ese nombre en el torneo.', 409);
  }
};

const normalizarIntegrantes = (integrantes: string[]): string[] =>
  integrantes.map((nombre) => nombre.trim());

/**
 * Inscribe un equipo en un torneo en borrador. No deja inscribir más equipos
 * que la cantidad de participantes del torneo ni repetir nombres.
 */
export const crearEquipo = async (
  torneoId: number,
  usuarioId: number,
  datos: DatosNuevoEquipo
): Promise<EquipoPublico> => {
  const torneo = await buscarTorneoEditable(torneoId, usuarioId);
  const nombre = datos.nombre.trim();

  const inscriptos = await equipoRepository.contarEquiposDeTorneo(torneoId);
  if (inscriptos >= torneo.cantidadParticipantes) {
    throw new AppError(
      `El torneo ya tiene sus ${torneo.cantidadParticipantes} participantes inscriptos.`,
      409
    );
  }

  await exigirNombreLibre(torneoId, nombre);

  return equipoRepository.crearEquipo(torneoId, {
    nombre,
    integrantes: normalizarIntegrantes(datos.integrantes ?? []),
  });
};

/** Equipos de un torneo del organizador, con sus integrantes. */
export const listarEquipos = async (
  torneoId: number,
  usuarioId: number
): Promise<EquipoPublico[]> => {
  await obtenerTorneo(torneoId, usuarioId);

  return equipoRepository.listarEquiposDeTorneo(torneoId);
};

/**
 * Edita un equipo de un torneo en borrador. Los cambios son parciales; si se
 * envían integrantes, la lista nueva reemplaza a la anterior.
 */
export const actualizarEquipo = async (
  torneoId: number,
  equipoId: number,
  usuarioId: number,
  cambios: DatosActualizarEquipo
): Promise<EquipoPublico> => {
  await buscarTorneoEditable(torneoId, usuarioId);
  await buscarEquipoDelTorneo(torneoId, equipoId);

  const datos: DatosActualizarEquipo = {};

  if (cambios.nombre !== undefined) {
    const nombre = cambios.nombre.trim();
    await exigirNombreLibre(torneoId, nombre, equipoId);
    datos.nombre = nombre;
  }

  if (cambios.integrantes !== undefined) {
    datos.integrantes = normalizarIntegrantes(cambios.integrantes);
  }

  return equipoRepository.actualizarEquipo(equipoId, datos);
};

/** Borra un equipo de un torneo en borrador, junto con sus integrantes. */
export const eliminarEquipo = async (
  torneoId: number,
  equipoId: number,
  usuarioId: number
): Promise<void> => {
  await buscarTorneoEditable(torneoId, usuarioId);
  await buscarEquipoDelTorneo(torneoId, equipoId);

  await equipoRepository.eliminarEquipo(equipoId);
};
