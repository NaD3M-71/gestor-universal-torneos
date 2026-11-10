import { EstadoTorneo, FormatoTorneo } from '@prisma/enums';
import * as equipoRepository from '@repositories/equipo.repository';
import * as torneoRepository from '@repositories/torneo.repository';
import type {
  DatosActualizarTorneo,
  DatosNuevoTorneo,
  TorneoPublico,
} from '../../types/torneo';
import { AppError } from '@middlewares/errors/AppError';
import {
  ErrorValidacion,
  type DetalleValidacion,
} from '../../middlewares/errors/ErrorValidacion';

/** Los campos del torneo cuyas reglas dependen unas de otras. */
export type ConfiguracionTorneo = Pick<
  TorneoPublico,
  'formato' | 'cantidadParticipantes' | 'cantidadGrupos'
>;

const MINIMO_PARTICIPANTES_POR_GRUPO = 2;

const esPotenciaDeDos = (n: number): boolean =>
  Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

/**
 * Valida las reglas que cruzan varios campos de un torneo:
 * - Solo grupos_eliminatorias lleva grupos; en ese formato son obligatorios.
 * - La cantidad de grupos es potencia de 2, para que no haya byes entre grupos.
 * - Cada grupo tiene al menos 2 participantes.
 * Si alguna falla lanza un ErrorValidacion (400) con un detalle por campo.
 */
export const validarConfiguracion = (config: ConfiguracionTorneo): void => {
  const detalles: DetalleValidacion[] = [];
  const { formato, cantidadParticipantes, cantidadGrupos } = config;

  if (formato === FormatoTorneo.grupos_eliminatorias) {
    if (cantidadGrupos === null) {
      detalles.push({
        campo: 'cantidadGrupos',
        mensaje: 'La cantidad de grupos es obligatoria en este formato.',
      });
    } else if (!esPotenciaDeDos(cantidadGrupos)) {
      detalles.push({
        campo: 'cantidadGrupos',
        mensaje: 'La cantidad de grupos debe ser potencia de 2 (2, 4, 8...).',
      });
    } else if (
      cantidadParticipantes <
      cantidadGrupos * MINIMO_PARTICIPANTES_POR_GRUPO
    ) {
      detalles.push({
        campo: 'cantidadParticipantes',
        mensaje: `Con ${cantidadGrupos} grupos hacen falta al menos ${cantidadGrupos * MINIMO_PARTICIPANTES_POR_GRUPO} participantes.`,
      });
    }
  } else if (cantidadGrupos !== null) {
    detalles.push({
      campo: 'cantidadGrupos',
      mensaje: 'Los grupos solo aplican al formato grupos_eliminatorias.',
    });
  }

  if (detalles.length > 0) {
    throw new ErrorValidacion(detalles);
  }
};

/** Una descripción vacía o solo con espacios se guarda como null. */
const normalizarDescripcion = (
  descripcion: string | null | undefined
): string | null => {
  const texto = descripcion?.trim();
  return texto === undefined || texto === '' ? null : texto;
};

/**
 * Busca un torneo y comprueba que sea del organizador. Uno ajeno se informa
 * como inexistente (404) para no revelar que existe.
 */
const buscarTorneoPropio = async (
  id: number,
  usuarioId: number
): Promise<TorneoPublico> => {
  const torneo = await torneoRepository.buscarTorneoPorId(id);

  if (torneo === null || torneo.creadorId !== usuarioId) {
    throw new AppError('Torneo no encontrado.', 404);
  }

  return torneo;
};

/** La configuración de un torneo solo se toca mientras está en borrador. */
const exigirBorrador = (torneo: TorneoPublico, accion: string): void => {
  if (torneo.estado !== EstadoTorneo.borrador) {
    throw new AppError(`Solo se puede ${accion} un torneo en borrador.`, 409);
  }
};

/** Crea un torneo en borrador. Los datos ya pasaron las validaciones de forma. */
export const crearTorneo = async (
  datos: DatosNuevoTorneo
): Promise<TorneoPublico> => {
  const cantidadGrupos = datos.cantidadGrupos ?? null;

  validarConfiguracion({
    formato: datos.formato,
    cantidadParticipantes: datos.cantidadParticipantes,
    cantidadGrupos,
  });

  return torneoRepository.crearTorneo({
    ...datos,
    descripcion: normalizarDescripcion(datos.descripcion),
    cantidadGrupos,
  });
};

/** Torneos del organizador, del más nuevo al más viejo. */
export const listarTorneos = (usuarioId: number): Promise<TorneoPublico[]> =>
  torneoRepository.listarTorneosDeCreador(usuarioId);

/** Detalle de un torneo del organizador (404 si no existe o es de otro). */
export const obtenerTorneo = (
  id: number,
  usuarioId: number
): Promise<TorneoPublico> => buscarTorneoPropio(id, usuarioId);

/**
 * Edita un torneo en borrador. Los cambios son parciales: la configuración se
 * valida completa, combinando lo recibido con lo ya guardado. Si el formato
 * deja de ser grupos_eliminatorias y no se indican grupos, se limpian solos.
 * Cambiar la cantidad de grupos descarta los grupos asignados a los equipos.
 */
export const actualizarTorneo = async (
  id: number,
  usuarioId: number,
  cambios: DatosActualizarTorneo
): Promise<TorneoPublico> => {
  const actual = await buscarTorneoPropio(id, usuarioId);
  exigirBorrador(actual, 'modificar');

  const formato = cambios.formato ?? actual.formato;
  const cantidadParticipantes =
    cambios.cantidadParticipantes ?? actual.cantidadParticipantes;

  let cantidadGrupos: number | null;
  if (cambios.cantidadGrupos !== undefined) {
    cantidadGrupos = cambios.cantidadGrupos;
  } else if (formato === FormatoTorneo.grupos_eliminatorias) {
    cantidadGrupos = actual.cantidadGrupos;
  } else {
    cantidadGrupos = null;
  }

  validarConfiguracion({ formato, cantidadParticipantes, cantidadGrupos });

  if (cambios.cantidadParticipantes !== undefined) {
    const equipos = await equipoRepository.contarEquiposDeTorneo(id);
    if (equipos > cambios.cantidadParticipantes) {
      throw new AppError(
        `Ya hay ${equipos} equipos inscriptos: la cantidad de participantes no puede ser menor.`,
        409
      );
    }
  }

  // Si cambia la cantidad de grupos (o el formato deja de usarlos), los grupos
  // ya asignados dejan de ser válidos y se descartan.
  if (cantidadGrupos !== actual.cantidadGrupos) {
    await equipoRepository.limpiarGrupos(id);
  }

  const datos: DatosActualizarTorneo = { ...cambios, cantidadGrupos };
  if (cambios.descripcion !== undefined) {
    datos.descripcion = normalizarDescripcion(cambios.descripcion);
  }

  return torneoRepository.actualizarTorneo(id, datos);
};

/** Borra un torneo en borrador, junto con sus equipos e integrantes. */
export const eliminarTorneo = async (
  id: number,
  usuarioId: number
): Promise<void> => {
  const torneo = await buscarTorneoPropio(id, usuarioId);
  exigirBorrador(torneo, 'eliminar');

  await torneoRepository.eliminarTorneo(id);
};

/** Sirve para cancelar un torneo. Solo permite cancelarlo si está activo, no finalizado, y si no se cancelo antes */
export const cancelarTorneo = async (
  id: number,
  usuarioId: number
): Promise<TorneoPublico> => {
  const torneo = await buscarTorneoPropio(id, usuarioId);

  if (torneo.estado === EstadoTorneo.finalizado) {
    throw new AppError(
      'No se puede cancelar un torneo que ya ha finalizado.',
      409
    );
  }

  if (torneo.estado === EstadoTorneo.cancelado) {
    throw new AppError('El torneo ya se encuentra cancelado.', 400);
  }

  // Si está en borrador o en_curso, se permite cancelar lógicamente
  return await torneoRepository.cambiarEstadoTorneo(id, EstadoTorneo.cancelado);
};
