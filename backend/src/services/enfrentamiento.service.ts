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
  EnfrentamientoConFase,
  EnfrentamientoPublico,
  PromocionAlSiguiente,
  PromocionDeSerie,
  ResultadoEnfrentamiento,
} from '../types/enfrentamiento';

const ESTADO_FASE_ACTIVA = 'activa';
const TIPO_FASE_ELIMINACION = 'eliminacion';

const MENSAJE_GANADOR_O_EMPATE =
  'Indicá el ganador o marcá empate (una sola de las dos).';

/**
 * Valida las reglas del cuerpo que cruzan varios campos:
 * - Hay que elegir un ganador o marcar empate, pero no las dos cosas. Un
 *   cuerpo con solo el marcador también pasa: es la forma de cargar la ida de
 *   una serie. Si el partido no es una ida, cargarResultado lo rechaza después
 *   con exigirGanadorOEmpate.
 * - El marcador va completo (los dos lados) o no va.
 * El marcador no se compara con el ganador: en algunas disciplinas (golf) gana
 * el menor puntaje. Si hay algún error lanza un ErrorValidacion (400).
 */
export const validarDatosResultado = (datos: DatosResultado): void => {
  const detalles: DetalleValidacion[] = [];
  const hayGanador = datos.ganadorId !== undefined;
  const hayEmpate = datos.empate === true;
  const hayMarcador =
    datos.resultadoA !== undefined && datos.resultadoB !== undefined;

  if (
    (hayGanador && hayEmpate) ||
    (!hayGanador && !hayEmpate && !hayMarcador)
  ) {
    detalles.push({ campo: 'ganadorId', mensaje: MENSAJE_GANADOR_O_EMPATE });
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
  // Un comentario vacío o solo con espacios se guarda como null. Como el
  // marcador, volver a cargar el resultado sin comentario lo borra.
  const comentario = datos.comentario?.trim();

  return {
    ganadorId: esEmpate ? null : (datos.ganadorId ?? null),
    resultadoA: datos.resultadoA ?? marcadorPorDefecto,
    resultadoB: datos.resultadoB ?? marcadorPorDefecto,
    comentario:
      comentario === undefined || comentario === '' ? null : comentario,
  };
};

/** Los partidos que no son la ida de una serie exigen ganador o empate (400). */
const exigirGanadorOEmpate = (datos: DatosResultado): void => {
  if (datos.ganadorId === undefined && datos.empate !== true) {
    throw new ErrorValidacion([
      { campo: 'ganadorId', mensaje: MENSAJE_GANADOR_O_EMPATE },
    ]);
  }
};

/**
 * Carga o corrige la ida de una serie: solo su marcador, sin ganador ni
 * empate (quien avanza se indica al cargar la vuelta). Es informativo y no
 * promueve a nadie.
 */
const cargarIda = async (
  enfrentamientoId: number,
  datos: DatosResultado
): Promise<EnfrentamientoPublico> => {
  if (datos.ganadorId !== undefined || datos.empate === true) {
    throw new ErrorValidacion([
      {
        campo: 'ganadorId',
        mensaje:
          'En la ida solo se carga el marcador: quien avanza se indica al cargar la vuelta.',
      },
    ]);
  }

  return enfrentamientoRepository.guardarResultado(
    enfrentamientoId,
    armarResultado(datos)
  );
};

/**
 * Qué hay que hacer en el partido siguiente al cargar el ganador de uno de
 * eliminación: ubicarlo como equipo A o B según el orden de id de los dos
 * partidos que alimentan al siguiente (el de menor id entra como A). Devuelve
 * null si no hay nada que promover: es la final o el ganador no cambió (solo
 * se corrige el marcador). Si el partido siguiente ya se jugó, no se puede
 * cambiar al ganador: primero hay que corregir ese resultado (409).
 */
const armarPromocion = async (
  enfrentamiento: EnfrentamientoConFase,
  ganadorId: number
): Promise<PromocionAlSiguiente | null> => {
  if (
    enfrentamiento.siguienteId === null ||
    enfrentamiento.ganadorId === ganadorId
  ) {
    return null;
  }

  const siguiente = await enfrentamientoRepository.buscarSiguiente(
    enfrentamiento.siguienteId
  );

  if (siguiente === null) {
    throw new AppError('No se encontró el partido siguiente del cuadro.', 500);
  }

  if (siguiente.ganadorId !== null) {
    throw new AppError(
      'No se puede cambiar el ganador: el partido siguiente ya tiene resultado. Corregí primero ese resultado.',
      409
    );
  }

  return {
    siguienteId: siguiente.id,
    lado: siguiente.alimentadoresIds[0] === enfrentamiento.id ? 'A' : 'B',
    equipoId: ganadorId,
  };
};

/**
 * Igual que armarPromocion, pero para la vuelta de una serie: quien avanza se
 * ubica en la ida del cruce siguiente (como equipo A o B según el orden de id
 * de los dos partidos que la alimentan) y, con el lado invertido, en su vuelta.
 * Devuelve null si no hay nada que promover (es la final, o quien avanza no
 * cambió y solo se corrige el marcador). Si el cruce siguiente ya tiene
 * algún resultado, no se puede cambiar quién avanza (409).
 */
const armarPromocionDeSerie = async (
  vuelta: EnfrentamientoConFase,
  ganadorId: number
): Promise<PromocionDeSerie | null> => {
  if (vuelta.siguienteId === null || vuelta.ganadorId === ganadorId) {
    return null;
  }

  const siguiente = await enfrentamientoRepository.buscarSiguienteDeSerie(
    vuelta.siguienteId
  );

  if (siguiente === null) {
    throw new AppError('No se encontró el cruce siguiente del cuadro.', 500);
  }

  if (siguiente.jugado) {
    throw new AppError(
      'No se puede cambiar quién avanza: el cruce siguiente ya tiene resultado. Corregí primero ese resultado.',
      409
    );
  }

  return {
    idaId: siguiente.idaId,
    vueltaId: siguiente.vueltaId,
    lado: siguiente.alimentadoresIds[0] === vuelta.id ? 'A' : 'B',
    equipoId: ganadorId,
  };
};

/**
 * Carga o corrige el resultado de un enfrentamiento (volver a cargar
 * sobrescribe el anterior). Solo se puede con el torneo en curso y la fase
 * del enfrentamiento activa. El enfrentamiento tiene que ser del torneo de
 * la URL y el torneo del organizador (404 si no). Con sistema de puntuación
 * ganada_perdida no hay empates.
 *
 * En una fase de eliminación el ganador es obligatorio (no hay empates, sin
 * importar el sistema de puntuación) y pasa solo al partido siguiente, en la
 * misma transacción. Corregir al ganador se bloquea si el partido siguiente
 * ya tiene resultado.
 *
 * En una eliminación a ida y vuelta la ida solo lleva su marcador (sin ganador
 * ni empate) y no promueve a nadie. En la vuelta el ganador es quien avanza en
 * la serie, lo marca siempre el organizador (el marcador es informativo) y se
 * promueve a la ida y a la vuelta del cruce siguiente. La vuelta no exige que
 * la ida tenga marcador: así una final se puede jugar a partido único.
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

  const esIda =
    enfrentamiento.fase.tipo === TIPO_FASE_ELIMINACION &&
    enfrentamiento.fase.idaYVuelta &&
    enfrentamiento.tieneVuelta;

  if (esIda) {
    return cargarIda(enfrentamientoId, datos);
  }

  exigirGanadorOEmpate(datos);

  if (enfrentamiento.fase.tipo === TIPO_FASE_ELIMINACION) {
    const ganadorId = datos.ganadorId;

    if (datos.empate === true || ganadorId === undefined) {
      throw new AppError(
        'En una eliminatoria no hay empates: indicá un ganador.',
        409
      );
    }

    // Vuelta de una serie: el ganador avanza a la ida y a la vuelta siguientes.
    if (enfrentamiento.vueltaDeId !== null) {
      const promocionDeSerie = await armarPromocionDeSerie(
        enfrentamiento,
        ganadorId
      );

      return promocionDeSerie === null
        ? enfrentamientoRepository.guardarResultado(
            enfrentamientoId,
            armarResultado(datos)
          )
        : enfrentamientoRepository.guardarResultadoConPromocionDeSerie(
            enfrentamientoId,
            armarResultado(datos),
            promocionDeSerie
          );
    }

    const promocion = await armarPromocion(enfrentamiento, ganadorId);

    return promocion === null
      ? enfrentamientoRepository.guardarResultado(
          enfrentamientoId,
          armarResultado(datos)
        )
      : enfrentamientoRepository.guardarResultadoConPromocion(
          enfrentamientoId,
          armarResultado(datos),
          promocion
        );
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
