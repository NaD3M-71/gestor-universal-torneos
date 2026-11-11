import { randomInt } from 'node:crypto';
import { EstadoTorneo, FormatoTorneo } from '@prisma/enums';
import * as equipoRepository from '@repositories/equipo.repository';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '@middlewares/errors/AppError';
import {
  ErrorValidacion,
  type DetalleValidacion,
} from '../middlewares/errors/ErrorValidacion';
import type {
  AsignacionGrupo,
  DatosActualizarEquipo,
  DatosNuevoEquipo,
  EquipoPublico,
} from '../types/equipo';
import type { TorneoPublico } from '../types/torneo';

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

  // TODO(deuda técnica): el cupo y el nombre repetido se comprueban antes de
  // guardar, pero sin una operación atómica ni un índice único en la base
  // (torneo_id, lower(nombre)). Dos altas simultáneas podrían repetir un nombre
  // o pasarse del cupo. Hoy se evita deshabilitando el botón de alta en el
  // frontend (tarjeta 2.7).
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

/**
 * Cantidad de grupos de un torneo en borrador que usa grupos. Los grupos solo
 * existen en el formato grupos_eliminatorias.
 */
const buscarCantidadDeGrupos = async (
  torneoId: number,
  usuarioId: number
): Promise<number> => {
  const torneo = await buscarTorneoEditable(torneoId, usuarioId);

  if (
    torneo.formato !== FormatoTorneo.grupos_eliminatorias ||
    torneo.cantidadGrupos === null
  ) {
    throw new AppError(
      'Los grupos solo aplican a torneos con formato grupos_eliminatorias.',
      409
    );
  }

  return torneo.cantidadGrupos;
};

/**
 * Asigna los grupos de todo el torneo de una vez. La lista reemplaza a la
 * anterior: los equipos que no figuren o lleguen con grupo null quedan sin
 * grupo. No hay tope de equipos por grupo (el reparto es libre). Devuelve 400
 * con un detalle por asignación si un equipo no es del torneo, se repite o el
 * grupo supera la cantidad de grupos del torneo.
 */
export const asignarGrupos = async (
  torneoId: number,
  usuarioId: number,
  asignaciones: AsignacionGrupo[]
): Promise<EquipoPublico[]> => {
  const cantidadGrupos = await buscarCantidadDeGrupos(torneoId, usuarioId);
  const equipos = await equipoRepository.listarEquiposDeTorneo(torneoId);
  const idsDelTorneo = new Set(equipos.map((equipo) => equipo.id));
  const vistos = new Set<number>();
  const detalles: DetalleValidacion[] = [];

  asignaciones.forEach(({ equipoId, grupo }, indice) => {
    if (!idsDelTorneo.has(equipoId)) {
      detalles.push({
        campo: `asignaciones[${indice}].equipoId`,
        mensaje: 'El equipo no pertenece al torneo.',
      });
    } else if (vistos.has(equipoId)) {
      detalles.push({
        campo: `asignaciones[${indice}].equipoId`,
        mensaje: 'El equipo está repetido en la lista.',
      });
    }
    vistos.add(equipoId);

    if (grupo !== null && grupo > cantidadGrupos) {
      detalles.push({
        campo: `asignaciones[${indice}].grupo`,
        mensaje: `El torneo tiene ${cantidadGrupos} grupos: el grupo debe estar entre 1 y ${cantidadGrupos}.`,
      });
    }
  });

  if (detalles.length > 0) {
    throw new ErrorValidacion(detalles);
  }

  return equipoRepository.reemplazarGrupos(torneoId, asignaciones);
};

/** Mezcla una lista al azar (Fisher-Yates) sin modificar la original. */
const mezclar = <T>(lista: T[]): T[] => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
};

/**
 * Sorteo: reparte al azar todos los equipos inscriptos entre los grupos del
 * torneo, en forma pareja (los grupos difieren como mucho en un equipo).
 * Reemplaza cualquier asignación anterior.
 */
export const sortearGrupos = async (
  torneoId: number,
  usuarioId: number
): Promise<EquipoPublico[]> => {
  const cantidadGrupos = await buscarCantidadDeGrupos(torneoId, usuarioId);
  const equipos = await equipoRepository.listarEquiposDeTorneo(torneoId);

  const asignaciones = mezclar(equipos).map((equipo, indice) => ({
    equipoId: equipo.id,
    grupo: (indice % cantidadGrupos) + 1,
  }));

  return equipoRepository.reemplazarGrupos(torneoId, asignaciones);
};
