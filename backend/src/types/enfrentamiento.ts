/**
 * Datos públicos de un enfrentamiento tal como se devuelven a la API. Sin
 * ganador ni marcador, el enfrentamiento sigue pendiente. Un empate se guarda
 * siempre con marcador (0-0 si no se aclara) y ganadorId null.
 */
export interface EnfrentamientoPublico {
  id: number;
  faseId: number;
  equipoAId: number | null;
  equipoBId: number | null;
  resultadoA: number | null;
  resultadoB: number | null;
  instancia: string | null;
  ganadorId: number | null;
  comentario: string | null;
}

/**
 * Enfrentamiento junto con su fase, para validar antes de cargar un resultado.
 * siguienteId es el partido al que pasa el ganador en una eliminatoria (null
 * en la final y en las fases de liga o grupos).
 */
export interface EnfrentamientoConFase extends EnfrentamientoPublico {
  siguienteId: number | null;
  fase: {
    id: number;
    torneoId: number;
    tipo: string;
    estado: string;
    idaYVuelta: boolean;
  };
}

/** Partido siguiente de una eliminatoria, con lo necesario para promover a un equipo. */
export interface SiguienteEnfrentamiento {
  id: number;
  ganadorId: number | null;
  /** Ids de los partidos que lo alimentan, de menor a mayor. */
  alimentadoresIds: number[];
}

/** Equipo que pasa al partido siguiente, y en qué lado (A o B) entra. */
export interface PromocionAlSiguiente {
  siguienteId: number;
  lado: 'A' | 'B';
  equipoId: number;
}

/**
 * Resultado tal como llega del organizador (DTO de entrada): un ganador o un
 * empate, con marcador opcional. El marcador va completo (los dos lados) o no
 * va. Es informativo: el que gana lo define ganadorId, no el marcador.
 */
export interface DatosResultado {
  ganadorId?: number | undefined;
  empate?: boolean | undefined;
  resultadoA?: number | undefined;
  resultadoB?: number | undefined;
  /** Aclaración opcional, por ejemplo "Ganó X por penales" (hasta 255 caracteres). */
  comentario?: string | undefined;
}

/**
 * Resultado ya validado, listo para guardar. ganadorId null significa empate,
 * y en ese caso el marcador siempre está cargado.
 */
export interface ResultadoEnfrentamiento {
  ganadorId: number | null;
  resultadoA: number | null;
  resultadoB: number | null;
  comentario: string | null;
}
