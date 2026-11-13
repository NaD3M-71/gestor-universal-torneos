import { SistemaPuntuacion } from '@prisma/enums';
import * as posicionRepository from '@repositories/posicion.repository';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../middlewares/errors/AppError';
import type { FasePublica } from '../types/fase';
import type {
  EnfrentamientoJugado,
  EquipoParaTabla,
  FilaPosicion,
  PuntosPorResultado,
  TablaPosiciones,
} from '../types/posicion';

const ESTADO_FASE_ACTIVA = 'activa';
const TIPO_FASE_ELIMINACION = 'eliminacion';

/** Puntos por victoria y empate de cada sistema (la derrota no suma). */
export const PUNTOS_POR_SISTEMA: Record<SistemaPuntuacion, PuntosPorResultado> =
  {
    [SistemaPuntuacion.ganada_perdida]: { victoria: 1, empate: 0 },
    [SistemaPuntuacion.futbol_clasico]: { victoria: 3, empate: 1 },
    [SistemaPuntuacion.sistema_alternativo]: { victoria: 2, empate: 1 },
  };

/** Lo que se va sumando de cada equipo mientras se recorren los partidos. */
interface Acumulado {
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  puntos: number;
  aFavor: number;
  enContra: number;
}

const acumuladoVacio = (): Acumulado => ({
  pj: 0,
  pg: 0,
  pe: 0,
  pp: 0,
  puntos: 0,
  aFavor: 0,
  enContra: 0,
});

/**
 * Elige la fase de la tabla: la pedida por faseId (404 si no es del torneo) o,
 * si no se pide ninguna, la activa y, si no hay activa, la última.
 */
export const elegirFase = (
  fases: FasePublica[],
  faseId?: number
): FasePublica => {
  if (faseId !== undefined) {
    const pedida = fases.find((fase) => fase.id === faseId);
    if (pedida === undefined) {
      throw new AppError('Fase no encontrada.', 404);
    }
    return pedida;
  }

  const fase = fases.find((f) => f.estado === ESTADO_FASE_ACTIVA) ?? fases[0];
  if (fase === undefined) {
    throw new AppError(
      'El torneo todavía no tiene fases: iniciá el torneo primero.',
      409
    );
  }
  return fase;
};

/** Suma un partido jugado a los dos equipos que lo disputaron. */
const acumularPartido = (
  acumulados: Map<number, Acumulado>,
  partido: EnfrentamientoJugado,
  puntos: PuntosPorResultado
): void => {
  const a = acumulados.get(partido.equipoAId);
  const b = acumulados.get(partido.equipoBId);
  if (a === undefined || b === undefined) {
    return;
  }

  a.pj += 1;
  b.pj += 1;

  if (partido.ganadorId === partido.equipoAId) {
    a.pg += 1;
    a.puntos += puntos.victoria;
    b.pp += 1;
  } else if (partido.ganadorId === partido.equipoBId) {
    b.pg += 1;
    b.puntos += puntos.victoria;
    a.pp += 1;
  } else {
    a.pe += 1;
    b.pe += 1;
    a.puntos += puntos.empate;
    b.puntos += puntos.empate;
  }

  // El marcador es informativo: solo suma si se cargó completo.
  if (partido.resultadoA !== null && partido.resultadoB !== null) {
    a.aFavor += partido.resultadoA;
    a.enContra += partido.resultadoB;
    b.aFavor += partido.resultadoB;
    b.enContra += partido.resultadoA;
  }
};

/**
 * Arma la tabla agregando los partidos jugados. El orden es provisional: los
 * empates solo se resuelven al cierre de la fase, y solo si son relevantes.
 * Criterio: grupo, puntos, ventajaDesempate (0 hasta que el organizador la
 * define), diferencia y nombre, todos de mayor a menor salvo el nombre. La
 * posición va secuencial dentro de cada grupo (sin grupos, es una sola tabla).
 */
export const calcularPosiciones = (
  equipos: EquipoParaTabla[],
  jugados: EnfrentamientoJugado[],
  puntos: PuntosPorResultado
): FilaPosicion[] => {
  const acumulados = new Map<number, Acumulado>(
    equipos.map((equipo) => [equipo.id, acumuladoVacio()])
  );
  jugados.forEach((partido) => acumularPartido(acumulados, partido, puntos));

  const filas: FilaPosicion[] = equipos.map((equipo) => {
    const acumulado = acumulados.get(equipo.id) ?? acumuladoVacio();
    return {
      posicion: 0,
      equipoId: equipo.id,
      nombre: equipo.nombre,
      grupo: equipo.grupo,
      ...acumulado,
      diferencia: acumulado.aFavor - acumulado.enContra,
      ventajaDesempate: equipo.ventajaDesempate,
    };
  });

  filas.sort(
    (x, y) =>
      (x.grupo ?? 0) - (y.grupo ?? 0) ||
      y.puntos - x.puntos ||
      y.ventajaDesempate - x.ventajaDesempate ||
      y.diferencia - x.diferencia ||
      x.nombre.localeCompare(y.nombre, 'es')
  );

  let grupoActual: number | null | undefined = undefined;
  let lugar = 0;
  filas.forEach((fila) => {
    if (fila.grupo !== grupoActual) {
      grupoActual = fila.grupo;
      lugar = 0;
    }
    lugar += 1;
    fila.posicion = lugar;
  });

  return filas;
};

/**
 * Tabla de posiciones de una fase de liga o grupos de un torneo del
 * organizador (404 si no es suyo). Sin faseId usa la fase activa. Las fases de
 * eliminación no tienen tabla (409): se muestran como cuadro.
 */
export const obtenerPosiciones = async (
  torneoId: number,
  usuarioId: number,
  faseId?: number
): Promise<TablaPosiciones> => {
  const torneo = await obtenerTorneo(torneoId, usuarioId);
  const fases = await posicionRepository.listarFasesDeTorneo(torneoId);
  const fase = elegirFase(fases, faseId);

  if (fase.tipo === TIPO_FASE_ELIMINACION) {
    throw new AppError(
      'Las fases de eliminación no tienen tabla de posiciones: se muestran como cuadro.',
      409
    );
  }

  const [equipos, jugados] = await Promise.all([
    posicionRepository.listarEquiposParaTabla(torneoId),
    posicionRepository.listarEnfrentamientosJugados(fase.id),
  ]);

  return {
    faseId: fase.id,
    sistemaPuntuacion: torneo.sistemaPuntuacion,
    posiciones: calcularPosiciones(
      equipos,
      jugados,
      PUNTOS_POR_SISTEMA[torneo.sistemaPuntuacion]
    ),
    comentarioDesempate: fase.comentarioDesempate,
  };
};
