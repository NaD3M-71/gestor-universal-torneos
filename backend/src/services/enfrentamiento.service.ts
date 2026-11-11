import { EstadoTorneo, SistemaPuntuacion } from '@prisma/enums';
import * as enfrentamientoRepository from '@repositories/enfrentamiento.repository';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../middlewares/errors/AppError';
import {
  ErrorValidacion,
  type DetalleValidacion,
} from '../middlewares/errors/ErrorValidacion';
import type {
  DatosResultado,
  EnfrentamientoPublico,
  ResultadoEnfrentamiento,
} from '../types/enfrentamiento';

const ESTADO_FASE_ACTIVA = 'activa';

/**
 * Valida las reglas del cuerpo que cruzan varios campos:
 * - Hay que elegir un ganador o marcar empate, pero no las dos cosas.
 * - El marcador va completo (los dos lados) o no va.
 * El marcador no se compara con el ganador: en algunas disciplinas (golf) gana
 * el menor puntaje. Si hay algún error lanza un ErrorValidacion (400).
 */
export const validarDatosResultado = (datos: DatosResultado): void => {
  const detalles: DetalleValidacion[] = [];
  const hayGanador = datos.ganadorId !== undefined;
  const hayEmpate = datos.empate === true;

  if (hayGanador === hayEmpate) {
    detalles.push({
      campo: 'ganadorId',
      mensaje: 'Indicá el ganador o marcá empate (una sola de las dos).',
    });
  }

  if ((datos.resultadoA === undefined) !== (datos.resultadoB === undefined)) {
    detalles.push({
      campo: 'resultadoA',
      mensaje: 'El marcador se carga completo: resultadoA y resultadoB juntos.',
    });
  }

  if (detalles.length > 0) {
    throw new ErrorValidacion(detalles);
  }
};

/**
 * Arma lo que se guarda. Un empate sin marcador se guarda como 0-0, así queda
 * marcado como jugado y no se confunde con un enfrentamiento pendiente.
 *
 * TODO: revisar este diseño cuando haya más tiempo. Qué pasó: las posiciones
 * se calculan por ganador o empate, no por marcador (en el golf, por ejemplo,
 * gana el menor puntaje), y el marcador es opcional. Pero un empate sin
 * marcador queda con ganador_id, resultado_a y resultado_b en null, igual que
 * un partido pendiente, y la base no los distingue. Como no había tiempo de
 * cambiar el esquema en las bases locales de ambos, se resolvió así: el
 * empate sin marcador se guarda como 0-0 (el frontend no habilita guardar
 * hasta elegir ganador o empate). Limitaciones: un 0-0 guardado puede ser un
 * empate real o un marcador cargado a propósito, y "jugado" se deduce de
 * ganador_id o marcador no nulo. Alternativa a evaluar: una columna boolean
 * `empate` (default false) en Enfrentamiento, con el marcador siempre
 * opcional, o un campo de estado del enfrentamiento (pendiente / jugado).
 */
const armarResultado = (datos: DatosResultado): ResultadoEnfrentamiento => {
  const esEmpate = datos.empate === true;
  const marcadorPorDefecto = esEmpate ? 0 : null;

  return {
    ganadorId: esEmpate ? null : (datos.ganadorId ?? null),
    resultadoA: datos.resultadoA ?? marcadorPorDefecto,
    resultadoB: datos.resultadoB ?? marcadorPorDefecto,
  };
};

/**
 * Carga o corrige el resultado de un enfrentamiento (volver a cargar
 * sobrescribe el anterior). Solo se puede con el torneo en curso y la fase
 * del enfrentamiento activa. El enfrentamiento tiene que ser del torneo de
 * la URL y el torneo del organizador (404 si no). Con sistema de puntuación
 * ganada_perdida no hay empates.
 */
export const cargarResultado = async (
  torneoId: number,
  enfrentamientoId: number,
  usuarioId: number,
  datos: DatosResultado
): Promise<EnfrentamientoPublico> => {
  validarDatosResultado(datos);

  const torneo = await obtenerTorneo(torneoId, usuarioId);
  const enfrentamiento =
    await enfrentamientoRepository.buscarEnfrentamientoConFase(
      enfrentamientoId
    );

  if (enfrentamiento === null || enfrentamiento.fase.torneoId !== torneoId) {
    throw new AppError('Enfrentamiento no encontrado.', 404);
  }

  if (torneo.estado !== EstadoTorneo.en_curso) {
    throw new AppError(
      'Solo se pueden cargar resultados en un torneo en curso.',
      409
    );
  }

  if (enfrentamiento.fase.estado !== ESTADO_FASE_ACTIVA) {
    throw new AppError(
      'Solo se pueden cargar resultados en la fase activa.',
      409
    );
  }

  if (enfrentamiento.equipoAId === null || enfrentamiento.equipoBId === null) {
    throw new AppError(
      'El enfrentamiento todavía no tiene definidos sus dos equipos.',
      409
    );
  }

  if (
    datos.ganadorId !== undefined &&
    datos.ganadorId !== enfrentamiento.equipoAId &&
    datos.ganadorId !== enfrentamiento.equipoBId
  ) {
    throw new ErrorValidacion([
      {
        campo: 'ganadorId',
        mensaje: 'El ganador tiene que ser uno de los dos equipos del partido.',
      },
    ]);
  }

  if (
    datos.empate === true &&
    torneo.sistemaPuntuacion === SistemaPuntuacion.ganada_perdida
  ) {
    throw new AppError(
      'Con el sistema ganada_perdida no hay empates: indicá un ganador.',
      409
    );
  }

  return enfrentamientoRepository.guardarResultado(
    enfrentamientoId,
    armarResultado(datos)
  );
};
