import { EstadoTorneo, type SistemaPuntuacion } from '@prisma/enums';
import * as faseRepository from '@repositories/fase.repository';
import {
  LINEA_DE_CORTE_POR_DEFECTO,
  calcularEmpatesDeFase,
  calcularTablaDeFase,
  detectarEmpatesRelevantes,
} from '@services/posicion.service';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../middlewares/errors/AppError';
import {
  asignarEquipos,
  expandirIdaYVuelta,
  generarBracket,
} from '@services/fixture/bracket.engine';
import type { FasePublica } from '../types/fase';
import type { Empate, FilaPosicion } from '../types/posicion';

const ESTADO_FASE_ACTIVA = 'activa';
const ESTADO_FASE_PENDIENTE = 'pendiente';
const TIPO_FASE_ELIMINACION = 'eliminacion';
const TIPO_FASE_LIGA = 'liga';

/** Mensaje de partidos pendientes, con singular y plural. */
const mensajePendientes = (cantidad: number): string =>
  cantidad === 1
    ? 'Falta 1 partido por jugar: cargá su resultado antes de cerrar la fase.'
    : `Faltan ${cantidad} partidos por jugar: cargá sus resultados antes de cerrar la fase.`;

/** Mensaje de empates sin resolver, con singular y plural. */
const mensajeEmpates = (cantidad: number): string =>
  cantidad === 1
    ? 'Hay 1 empate en puntos que afecta la clasificación: resolvelo antes de cerrar la fase.'
    : `Hay ${cantidad} empates en puntos que afectan la clasificación: resolvelos antes de cerrar la fase.`;

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

/** Lo que devuelve cerrar una fase: ella ya cerrada y la que se armó a partir de ella. */
export interface FaseCerrada {
  fase: FasePublica;
  /** La fase siguiente, ya activa y con su cuadro; null si no hay o todavía no se arma. */
  faseSiguiente: FasePublica | null;
}

/**
 * Arma el cuadro de la eliminatoria que sigue a una liga (liguilla): clasifican
 * los primeros `lineaDeCorte` de la tabla y se siembran por posición, sin
 * sorteo. El 1.° se cruza con el último clasificado, el 2.° con el anteúltimo,
 * y así hacia el medio. Si los clasificados no son potencia de 2, los byes
 * son para los mejor ubicados. Con ida y vuelta cada cruce da dos filas.
 */
const armarCuadroDeLiguilla = async (
  torneoId: number,
  fase: FasePublica,
  siguiente: FasePublica,
  sistemaPuntuacion: SistemaPuntuacion
) => {
  if (fase.lineaDeCorte === null) {
    throw new AppError(
      'La fase no tiene línea de corte: no se puede armar la fase siguiente.',
      409
    );
  }

  const { filas } = await calcularTablaDeFase(
    torneoId,
    fase,
    sistemaPuntuacion
  );
  // La tabla ya viene ordenada: la posición 1 es la semilla 1.
  const clasificados = filas
    .filter((fila) => fila.posicion <= (fase.lineaDeCorte as number))
    .map((fila) => fila.equipoId);

  const partidos = asignarEquipos(
    generarBracket(clasificados.length),
    clasificados
  );
  return siguiente.idaYVuelta ? expandirIdaYVuelta(partidos) : partidos;
};

/**
 * Cierra una fase: la pasa a cerrada y, con eso, sus resultados quedan
 * bloqueados (cargarResultado solo acepta fases activas). El torneo tiene que
 * ser del organizador (404 si no) y estar en curso, y la fase tiene que ser de
 * ese torneo (404) y estar activa (409). Con partidos sin jugar no se puede
 * cerrar (409), ni con un empate en puntos relevante sin resolver (409): lo
 * resuelve el organizador con la ventaja de desempate (6.3).
 *
 * Si la fase es una liga y el formato sigue con una eliminatoria (liguilla,
 * 6.4), al cerrarla se arma el cuadro con los clasificados y se activa la fase
 * siguiente, todo en la misma transacción. Las otras tarjetas se enganchan
 * acá: la de grupos (6.5) y el cierre del torneo (6.6).
 */
export const cerrarFase = async (
  torneoId: number,
  faseId: number,
  usuarioId: number
): Promise<FaseCerrada> => {
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

  // Los empates en puntos solo existen en liga y grupos.
  if (fase.tipo !== TIPO_FASE_ELIMINACION) {
    const { empates } = await calcularEmpatesDeFase(
      torneoId,
      fase,
      torneo.sistemaPuntuacion
    );
    if (empates.length > 0) {
      throw new AppError(mensajeEmpates(empates.length), 409);
    }
  }

  const siguiente =
    fase.tipo === TIPO_FASE_LIGA
      ? await faseRepository.buscarFasePorOrden(torneoId, fase.orden + 1)
      : null;

  if (siguiente === null) {
    return {
      fase: await faseRepository.cerrarFase(faseId),
      faseSiguiente: null,
    };
  }

  if (
    siguiente.tipo !== TIPO_FASE_ELIMINACION ||
    siguiente.estado !== ESTADO_FASE_PENDIENTE
  ) {
    throw new AppError(
      'La fase siguiente no es una eliminatoria pendiente: no se puede armar.',
      409
    );
  }

  const partidos = await armarCuadroDeLiguilla(
    torneoId,
    fase,
    siguiente,
    torneo.sistemaPuntuacion
  );
  return faseRepository.cerrarFaseYActivarSiguiente(
    faseId,
    siguiente.id,
    partidos
  );
};

/**
 * Calcula las ventajas de desempate nuevas para resolver un empate. `grupo` son
 * las filas de la tabla con el mismo grupo y los mismos puntos que los
 * empatados; `orden` son los ids de los empatados, del mejor al peor. Se
 * reordenan los niveles de ventaja del grupo: el nivel del empate se abre en un
 * nivel por equipo, según `orden`, y los demás niveles conservan su lugar. Las
 * ventajas quedan de 0 (el peor) hacia arriba y el mejor tiene la mayor.
 * Devuelve solo los equipos cuya ventaja cambia.
 */
export const calcularVentajasDeDesempate = (
  grupo: FilaPosicion[],
  orden: number[]
): { equipoId: number; ventajaDesempate: number }[] => {
  const ordenados = new Set(orden);
  const ventajaEmpate = grupo.find((fila) =>
    ordenados.has(fila.equipoId)
  )?.ventajaDesempate;
  const valores = [...new Set(grupo.map((f) => f.ventajaDesempate))].sort(
    (a, b) => b - a
  );

  // Cada nivel es la lista de equipos que comparten ventaja, del mejor al peor.
  const niveles: number[][] = valores.flatMap((valor) =>
    valor === ventajaEmpate
      ? orden.map((id) => [id])
      : [
          grupo
            .filter((fila) => fila.ventajaDesempate === valor)
            .map((fila) => fila.equipoId),
        ]
  );

  const actual = new Map(grupo.map((f) => [f.equipoId, f.ventajaDesempate]));
  return niveles
    .flatMap((ids, indice) =>
      ids.map((equipoId) => ({
        equipoId,
        ventajaDesempate: niveles.length - 1 - indice,
      }))
    )
    .filter((v) => actual.get(v.equipoId) !== v.ventajaDesempate);
};

/**
 * Resuelve un empate en puntos con el criterio del organizador (6.3). `orden`
 * son los ids de los equipos empatados, del que merece el mejor puesto al peor:
 * tienen que ser exactamente los de un empate pendiente de la fase. El sistema
 * les asigna ventajas de desempate decrecientes y, si viene `comentario`,
 * reemplaza el de la fase. Solo en fases de liga o grupos activas, con todos
 * los partidos jugados, de un torneo en curso. Devuelve la fase y los empates
 * que quedan (vacío: ya se puede cerrar por este lado).
 */
export const resolverDesempate = async (
  torneoId: number,
  faseId: number,
  usuarioId: number,
  orden: number[],
  comentario?: string | null
): Promise<{ fase: FasePublica; empates: Empate[] }> => {
  const torneo = await obtenerTorneo(torneoId, usuarioId);
  const fase = await faseRepository.buscarFasePorId(faseId);

  if (fase === null || fase.torneoId !== torneoId) {
    throw new AppError('Fase no encontrada.', 404);
  }
  if (torneo.estado !== EstadoTorneo.en_curso) {
    throw new AppError(
      'Solo se puede resolver un desempate en un torneo en curso.',
      409
    );
  }
  if (fase.estado !== ESTADO_FASE_ACTIVA) {
    throw new AppError('La fase ya está cerrada.', 409);
  }
  if (fase.tipo === TIPO_FASE_ELIMINACION) {
    throw new AppError(
      'Las fases de eliminación no tienen empates en puntos.',
      409
    );
  }

  const pendientes = await contarPendientes(fase);
  if (pendientes > 0) {
    throw new AppError(mensajePendientes(pendientes), 409);
  }

  const { filas, jugados } = await calcularTablaDeFase(
    torneoId,
    fase,
    torneo.sistemaPuntuacion
  );
  const corte = fase.lineaDeCorte ?? LINEA_DE_CORTE_POR_DEFECTO;
  const ids = new Set(orden);
  const empate = detectarEmpatesRelevantes(filas, jugados, corte).find(
    (e) =>
      e.equipos.length === ids.size &&
      e.equipos.every((f) => ids.has(f.equipoId))
  );
  if (empate === undefined) {
    throw new AppError(
      'Los equipos indicados no coinciden con un empate pendiente de la fase.',
      409
    );
  }

  const grupo = filas.filter(
    (f) => f.grupo === empate.grupo && f.puntos === empate.puntos
  );
  const faseNueva = await faseRepository.guardarDesempate(
    faseId,
    calcularVentajasDeDesempate(grupo, orden),
    comentario
  );

  const { empates } = await calcularEmpatesDeFase(
    torneoId,
    faseNueva,
    torneo.sistemaPuntuacion
  );
  return { fase: faseNueva, empates };
};
