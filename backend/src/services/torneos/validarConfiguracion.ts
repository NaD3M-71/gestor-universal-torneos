import { FormatoTorneo } from '../../infrastructure/database/prisma/enums';
import {
  ErrorValidacion,
  type DetalleValidacion,
} from '../../middlewares/errors/ErrorValidacion';
import type { TorneoPublico } from '../../types/torneo';

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
