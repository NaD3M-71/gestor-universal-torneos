import { EstadoTorneo, FormatoTorneo } from '@prisma/enums';
import * as equipoRepository from '@repositories/equipo.repository';
import * as torneoRepository from '@repositories/torneo.repository';
import type {
  DatosActualizarTorneo,
  DatosNuevoTorneo,
  TorneoPublico,
} from '../types/torneo';
import type {
  DatosNuevaFase,
  DatosNuevoEnfrentamiento,
  DatosNuevoPartidoBracket,
  TorneoIniciado,
} from '../types/fase';
import { generarRoundRobin } from '@services/fixture/roundRobin.engine';
import {
  asignarEquipos,
  expandirIdaYVuelta,
  generarBracket,
  sortearParticipantes,
} from '@services/fixture/bracket.engine';
import { AppError } from '@middlewares/errors/AppError';
import {
  ErrorValidacion,
  type DetalleValidacion,
} from '../middlewares/errors/ErrorValidacion';

/**
 * Los campos del torneo cuyas reglas dependen unas de otras. La línea de corte
 * no es una columna del torneo (vive en su fase 1), pero se valida con el
 * resto de la configuración. idaYVuelta (de la fase de eliminación de los
 * formatos mixtos) es opcional: si no viene, no se valida.
 */
export type ConfiguracionTorneo = Pick<
  TorneoPublico,
  'formato' | 'cantidadParticipantes' | 'cantidadGrupos'
> & { lineaDeCorte: number | null; idaYVuelta?: boolean };

const MINIMO_PARTICIPANTES_POR_GRUPO = 2;
const MINIMO_CLASIFICADOS_LIGUILLA = 2;

const esPotenciaDeDos = (n: number): boolean =>
  Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

/**
 * Formatos mixtos: su primera fase lleva línea de corte y su segunda fase (la
 * eliminación) puede jugarse a ida y vuelta.
 */
const usaLineaDeCorte = (formato: FormatoTorneo): boolean =>
  formato === FormatoTorneo.liguilla_eliminacion ||
  formato === FormatoTorneo.grupos_eliminatorias;

/**
 * Valida las reglas que cruzan varios campos de un torneo:
 * - Solo grupos_eliminatorias lleva grupos; en ese formato son obligatorios.
 * - La cantidad de grupos es potencia de 2, para que no haya byes entre grupos.
 * - Cada grupo tiene al menos 2 participantes.
 * - La línea de corte es obligatoria en liguilla_eliminacion (total de
 *   clasificados, entre 2 y la cantidad de participantes) y en
 *   grupos_eliminatorias (clasificados por grupo, potencia de 2 y sin superar
 *   los participantes de un grupo); en los demás formatos no aplica.
 * - La ida y vuelta de la eliminación solo se pide en los formatos mixtos.
 * Si alguna falla lanza un ErrorValidacion (400) con un detalle por campo.
 */
export const validarConfiguracion = (config: ConfiguracionTorneo): void => {
  const detalles: DetalleValidacion[] = [];
  const {
    formato,
    cantidadParticipantes,
    cantidadGrupos,
    lineaDeCorte,
    idaYVuelta,
  } = config;

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

  if (formato === FormatoTorneo.liguilla_eliminacion) {
    if (lineaDeCorte === null) {
      detalles.push({
        campo: 'lineaDeCorte',
        mensaje: 'La línea de corte es obligatoria en este formato.',
      });
    } else if (
      lineaDeCorte < MINIMO_CLASIFICADOS_LIGUILLA ||
      lineaDeCorte > cantidadParticipantes
    ) {
      detalles.push({
        campo: 'lineaDeCorte',
        mensaje: `La línea de corte debe estar entre ${MINIMO_CLASIFICADOS_LIGUILLA} y la cantidad de participantes (${cantidadParticipantes}).`,
      });
    }
  } else if (formato === FormatoTorneo.grupos_eliminatorias) {
    if (lineaDeCorte === null) {
      detalles.push({
        campo: 'lineaDeCorte',
        mensaje: 'La línea de corte es obligatoria en este formato.',
      });
    } else if (!esPotenciaDeDos(lineaDeCorte)) {
      detalles.push({
        campo: 'lineaDeCorte',
        mensaje:
          'Los clasificados por grupo deben ser potencia de 2 (1, 2, 4...).',
      });
    } else if (
      cantidadGrupos !== null &&
      lineaDeCorte > Math.floor(cantidadParticipantes / cantidadGrupos)
    ) {
      detalles.push({
        campo: 'lineaDeCorte',
        mensaje:
          'Los clasificados por grupo no pueden superar los participantes de un grupo.',
      });
    }
  } else if (lineaDeCorte !== null) {
    detalles.push({
      campo: 'lineaDeCorte',
      mensaje:
        'La línea de corte solo aplica a los formatos liguilla_eliminacion y grupos_eliminatorias.',
    });
  }

  if (idaYVuelta === true && !usaLineaDeCorte(formato)) {
    detalles.push({
      campo: 'idaYVuelta',
      mensaje:
        'La ida y vuelta solo se pide en liguilla_eliminacion y grupos_eliminatorias; en los demás formatos la define el formato (liga_doble, eliminacion_doble).',
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

/**
 * Fases de cada formato, en orden. Se crean todas con el torneo (pendientes);
 * el fixture de cada una se genera cuando le toca: el de la primera al iniciar
 * el torneo y el de las siguientes al cerrar la anterior. La liga doble es una
 * liga con ida y vuelta, y la liguilla arranca con una liga de solo ida.
 */
const PLAN_DE_FASES: Record<FormatoTorneo, DatosNuevaFase[]> = {
  liga_simple: [{ tipo: 'liga', orden: 1, idaYVuelta: false }],
  liga_doble: [{ tipo: 'liga', orden: 1, idaYVuelta: true }],
  eliminacion_simple: [{ tipo: 'eliminacion', orden: 1, idaYVuelta: false }],
  eliminacion_doble: [{ tipo: 'eliminacion', orden: 1, idaYVuelta: true }],
  liguilla_eliminacion: [
    { tipo: 'liga', orden: 1, idaYVuelta: false },
    { tipo: 'eliminacion', orden: 2, idaYVuelta: false },
  ],
  grupos_eliminatorias: [
    { tipo: 'grupos', orden: 1, idaYVuelta: false },
    { tipo: 'eliminacion', orden: 2, idaYVuelta: false },
  ],
};

/**
 * Las fases de un formato, con la línea de corte puesta en la primera y, si se
 * pidió, la ida y vuelta en la de eliminación de los formatos mixtos (la
 * segunda).
 */
const fasesDeFormato = (
  formato: FormatoTorneo,
  lineaDeCorte: number | null,
  idaYVuelta: boolean
): DatosNuevaFase[] =>
  PLAN_DE_FASES[formato].map((fase) => {
    if (fase.orden === 1 && lineaDeCorte !== null) {
      return { ...fase, lineaDeCorte };
    }
    if (fase.orden === 2 && idaYVuelta) {
      return { ...fase, idaYVuelta: true };
    }
    return fase;
  });

/**
 * Crea un torneo en borrador junto con sus fases, que nacen pendientes y sin
 * enfrentamientos. Los datos ya pasaron las validaciones de forma.
 */
export const crearTorneo = async (
  datos: DatosNuevoTorneo
): Promise<TorneoPublico> => {
  const {
    lineaDeCorte: corteRecibido,
    idaYVuelta: idaYVueltaRecibido,
    ...datosTorneo
  } = datos;
  const cantidadGrupos = datos.cantidadGrupos ?? null;
  const lineaDeCorte = corteRecibido ?? null;
  const idaYVuelta = idaYVueltaRecibido ?? false;

  validarConfiguracion({
    formato: datos.formato,
    cantidadParticipantes: datos.cantidadParticipantes,
    cantidadGrupos,
    lineaDeCorte,
    idaYVuelta,
  });

  return torneoRepository.crearTorneo(
    {
      ...datosTorneo,
      descripcion: normalizarDescripcion(datos.descripcion),
      cantidadGrupos,
    },
    fasesDeFormato(datos.formato, lineaDeCorte, idaYVuelta)
  );
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
 * La línea de corte vive en la fase 1 y la ida y vuelta de la eliminación en
 * la fase 2: se combinan con lo guardado igual que los grupos, y si cambia el
 * formato (o alguno de los dos, o el torneo no tiene fases todavía) las fases
 * del torneo se vuelven a generar. Al cambiar de formato la línea de corte
 * guardada ya no vale (hay que indicarla de nuevo) y la ida y vuelta vuelve a
 * ser false.
 */
export const actualizarTorneo = async (
  id: number,
  usuarioId: number,
  cambios: DatosActualizarTorneo
): Promise<TorneoPublico> => {
  const actual = await buscarTorneoPropio(id, usuarioId);
  exigirBorrador(actual, 'modificar');

  const {
    lineaDeCorte: corteRecibido,
    idaYVuelta: idaYVueltaRecibido,
    ...cambiosDeTorneo
  } = cambios;
  const faseInicial = actual.fases?.find((fase) => fase.orden === 1);
  const corteActual = faseInicial?.lineaDeCorte ?? null;
  const idaYVueltaActual =
    actual.fases?.find((fase) => fase.orden === 2)?.idaYVuelta ?? false;

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

  let lineaDeCorte: number | null;
  if (corteRecibido !== undefined) {
    lineaDeCorte = corteRecibido;
  } else if (formato === actual.formato && usaLineaDeCorte(formato)) {
    lineaDeCorte = corteActual;
  } else {
    lineaDeCorte = null;
  }

  let idaYVuelta: boolean;
  if (idaYVueltaRecibido !== undefined) {
    idaYVuelta = idaYVueltaRecibido;
  } else if (formato === actual.formato && usaLineaDeCorte(formato)) {
    idaYVuelta = idaYVueltaActual;
  } else {
    idaYVuelta = false;
  }

  validarConfiguracion({
    formato,
    cantidadParticipantes,
    cantidadGrupos,
    lineaDeCorte,
    idaYVuelta,
  });

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

  const datos = { ...cambiosDeTorneo, cantidadGrupos };
  if (cambios.descripcion !== undefined) {
    datos.descripcion = normalizarDescripcion(cambios.descripcion);
  }

  const regenerarFases =
    faseInicial === undefined ||
    formato !== actual.formato ||
    lineaDeCorte !== corteActual ||
    idaYVuelta !== idaYVueltaActual;

  return torneoRepository.actualizarTorneo(
    id,
    datos,
    regenerarFases
      ? fasesDeFormato(formato, lineaDeCorte, idaYVuelta)
      : undefined
  );
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

const MINIMO_EQUIPOS_PARA_INICIAR = 2;

/**
 * Arma los enfrentamientos de una fase de liga con el método todos contra
 * todos. Cada fecha del fixture da una instancia: fecha_1, fecha_2, etc. En
 * liga doble las fechas de la vuelta siguen numerándose a continuación.
 */
const generarEnfrentamientosDeLiga = (
  equipoIds: number[],
  idaYVuelta: boolean
): DatosNuevoEnfrentamiento[] =>
  generarRoundRobin(equipoIds, idaYVuelta).flatMap((fecha) =>
    fecha.partidos.map((partido) => ({
      ...partido,
      instancia: `fecha_${fecha.numero}`,
    }))
  );

/**
 * Arma el cuadro completo de una eliminatoria: todas las rondas, con los
 * equipos ubicados en la primera. Como al iniciar el torneo no hay una fase
 * previa que dé un ranking, el orden de las semillas se sortea (y con él,
 * quiénes reciben bye). Los partidos de las rondas siguientes quedan sin
 * equipos hasta que se carguen los resultados. Con ida y vuelta cada cruce da
 * dos filas (ida y vuelta, esta con los lados invertidos); el bye sigue siendo
 * una sola fila.
 */
const generarPartidosDeEliminacion = (
  equipoIds: number[],
  idaYVuelta: boolean
): DatosNuevoPartidoBracket[] => {
  const partidos = asignarEquipos(
    generarBracket(equipoIds.length),
    sortearParticipantes(equipoIds)
  );

  return idaYVuelta ? expandirIdaYVuelta(partidos) : partidos;
};

/**
 * Inicia un torneo en borrador: lo pasa a en_curso (con lo que su
 * configuración queda bloqueada) y activa su primera fase, que ya existe desde
 * que se creó el torneo. Hacen falta al menos 2 equipos inscriptos. La cantidad de participantes pasa
 * a ser la de equipos realmente inscriptos. En grupos_eliminatorias, además,
 * todos los equipos tienen que tener grupo. Si la primera fase es una liga, sus
 * enfrentamientos se generan acá, en la misma transacción que la activación. Con
 * eliminación se genera el cuadro completo (todas las rondas); en la doble
 * (ida y vuelta) cada cruce tiene dos filas, incluida la final.
 */
export const iniciarTorneo = async (
  id: number,
  usuarioId: number
): Promise<TorneoIniciado> => {
  const torneo = await buscarTorneoPropio(id, usuarioId);
  exigirBorrador(torneo, 'iniciar');

  const fase = torneo.fases?.find((f) => f.orden === 1);
  if (fase === undefined) {
    throw new AppError(
      'El torneo no tiene fases: guardá su configuración de nuevo para generarlas.',
      409
    );
  }

  const equipos = await equipoRepository.listarEquiposDeTorneo(id);

  if (equipos.length < MINIMO_EQUIPOS_PARA_INICIAR) {
    throw new AppError(
      `Hacen falta al menos ${MINIMO_EQUIPOS_PARA_INICIAR} equipos inscriptos para iniciar el torneo.`,
      409
    );
  }

  if (
    torneo.formato === FormatoTorneo.grupos_eliminatorias &&
    equipos.some((equipo) => equipo.grupo === null)
  ) {
    throw new AppError(
      'Todos los equipos tienen que tener un grupo asignado para iniciar el torneo.',
      409
    );
  }

  // La configuración se vuelve a validar con la cantidad real de equipos.
  validarConfiguracion({
    formato: torneo.formato,
    cantidadParticipantes: equipos.length,
    cantidadGrupos: torneo.cantidadGrupos,
    lineaDeCorte: fase.lineaDeCorte,
  });

  if (fase.tipo === 'eliminacion') {
    return torneoRepository.iniciarTorneoConBracket(
      id,
      equipos.length,
      fase.id,
      generarPartidosDeEliminacion(
        equipos.map((equipo) => equipo.id),
        fase.idaYVuelta
      )
    );
  }

  const enfrentamientos =
    fase.tipo === 'liga'
      ? generarEnfrentamientosDeLiga(
          equipos.map((equipo) => equipo.id),
          fase.idaYVuelta
        )
      : [];

  return torneoRepository.iniciarTorneo(
    id,
    equipos.length,
    fase.id,
    enfrentamientos
  );
};
