import { SistemaPuntuacion } from '@prisma/enums';
import * as posicionRepository from '@repositories/posicion.repository';
import { obtenerTorneo } from '@services/torneo.service';
import { AppError } from '../middlewares/errors/AppError';
import type { FasePublica } from '../types/fase';
import type {
  Empate,
  EmpatesDeFase,
  EnfrentamientoJugado,
  EquipoParaTabla,
  FilaPosicion,
  PuntosPorResultado,
  TablaPosiciones,
} from '../types/posicion';

const ESTADO_FASE_ACTIVA = 'activa';
const ESTADO_FASE_PENDIENTE = 'pendiente';
const TIPO_FASE_ELIMINACION = 'eliminacion';

/** Línea de corte de una fase que no tiene: solo importa el 1.° puesto. */
export const LINEA_DE_CORTE_POR_DEFECTO = 1;

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
 * si no se pide ninguna, la activa y, si no hay activa, la última que ya
 * empezó. Las fases pendientes (todavía sin fixture) no se eligen solas.
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

  const empezadas = fases.filter((f) => f.estado !== ESTADO_FASE_PENDIENTE);
  const fase =
    empezadas.find((f) => f.estado === ESTADO_FASE_ACTIVA) ?? empezadas[0];
  if (fase === undefined) {
    throw new AppError(
      'El torneo todavía no tiene fases en juego: iniciá el torneo primero.',
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

/**
 * Busca los empates relevantes de una tabla ya ordenada (la de
 * calcularPosiciones). Un empate son equipos del mismo grupo con los mismos
 * puntos y la misma ventajaDesempate; la ventaja es lo que el organizador usa
 * para resolverlo. Es relevante si toca la zona de clasificados: alguno de los
 * empatados ocupa un puesto dentro de la línea de corte, ya sea que el empate
 * cruce el corte (define quién pasa) o quede adentro (define el cruce). Uno
 * que queda entero afuera se ignora. La línea de corte es por grupo.
 */
export const detectarEmpatesRelevantes = (
  filas: FilaPosicion[],
  jugados: EnfrentamientoJugado[],
  lineaDeCorte: number
): Empate[] => {
  // La tabla viene ordenada por grupo, puntos y ventaja: los empatados quedan
  // juntos, así que alcanza con agrupar filas consecutivas iguales.
  const bloques: FilaPosicion[][] = [];
  filas.forEach((fila) => {
    const bloque = bloques[bloques.length - 1];
    const anterior = bloque?.[0];
    if (
      bloque !== undefined &&
      anterior !== undefined &&
      anterior.grupo === fila.grupo &&
      anterior.puntos === fila.puntos &&
      anterior.ventajaDesempate === fila.ventajaDesempate
    ) {
      bloque.push(fila);
    } else {
      bloques.push([fila]);
    }
  });

  return bloques
    .filter(
      (bloque) =>
        bloque.length > 1 && (bloque[0]?.posicion ?? 0) <= lineaDeCorte
    )
    .map((bloque) => {
      const primera = bloque[0] as FilaPosicion;
      const ultima = bloque[bloque.length - 1] as FilaPosicion;
      const ids = new Set(bloque.map((fila) => fila.equipoId));

      return {
        grupo: primera.grupo,
        desdePosicion: primera.posicion,
        hastaPosicion: ultima.posicion,
        puntos: primera.puntos,
        equipos: bloque,
        directos: jugados.filter(
          (partido) => ids.has(partido.equipoAId) && ids.has(partido.equipoBId)
        ),
      };
    });
};

/**
 * Tabla de posiciones de una fase junto con los partidos jugados que la
 * originan, calculada en el momento.
 */
export const calcularTablaDeFase = async (
  torneoId: number,
  fase: FasePublica,
  sistemaPuntuacion: SistemaPuntuacion
): Promise<{ filas: FilaPosicion[]; jugados: EnfrentamientoJugado[] }> => {
  const [equipos, jugados] = await Promise.all([
    posicionRepository.listarEquiposParaTabla(torneoId),
    posicionRepository.listarEnfrentamientosJugados(fase.id),
  ]);

  return {
    filas: calcularPosiciones(
      equipos,
      jugados,
      PUNTOS_POR_SISTEMA[sistemaPuntuacion]
    ),
    jugados,
  };
};

/**
 * Empates relevantes de una fase de liga o grupos, calculados en el momento.
 * Sin línea de corte en la fase se usa LINEA_DE_CORTE_POR_DEFECTO (solo
 * importa un empate en el 1.° puesto). Devuelve también la línea usada.
 */
export const calcularEmpatesDeFase = async (
  torneoId: number,
  fase: FasePublica,
  sistemaPuntuacion: SistemaPuntuacion
): Promise<EmpatesDeFase> => {
  const { filas, jugados } = await calcularTablaDeFase(
    torneoId,
    fase,
    sistemaPuntuacion
  );
  const lineaDeCorte = fase.lineaDeCorte ?? LINEA_DE_CORTE_POR_DEFECTO;

  return {
    faseId: fase.id,
    lineaDeCorte,
    empates: detectarEmpatesRelevantes(filas, jugados, lineaDeCorte),
  };
};

/**
 * Empates relevantes de una fase de liga o grupos de un torneo del
 * organizador (404 si no es suyo; también si la fase no es del torneo). Las
 * fases de eliminación no tienen empates en puntos (409).
 */
export const obtenerEmpates = async (
  torneoId: number,
  usuarioId: number,
  faseId: number
): Promise<EmpatesDeFase> => {
  const torneo = await obtenerTorneo(torneoId, usuarioId);
  const fases = await posicionRepository.listarFasesDeTorneo(torneoId);
  const fase = elegirFase(fases, faseId);

  if (fase.tipo === TIPO_FASE_ELIMINACION) {
    throw new AppError(
      'Las fases de eliminación no tienen empates en puntos.',
      409
    );
  }

  return calcularEmpatesDeFase(torneoId, fase, torneo.sistemaPuntuacion);
};
