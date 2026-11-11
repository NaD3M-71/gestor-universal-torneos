// Motor todos contra todos (liga simple y doble). Función pura: no usa BD.

export interface PartidoGenerado {
  equipoAId: number;
  equipoBId: number;
}

export interface FechaGenerada {
  numero: number;
  partidos: PartidoGenerado[];
  equipoLibreId: number | null;
}

// Método del círculo: el primer equipo queda fijo y el resto rota una
// posición por fecha. Con cantidad impar se agrega un "libre" (null) y
// el equipo que le toca descansa esa fecha.
export function generarRoundRobin(
  equipoIds: number[],
  dobleVuelta: boolean
): FechaGenerada[] {
  if (equipoIds.length < 2) {
    throw new Error('Se necesitan al menos 2 equipos para generar el fixture');
  }
  if (new Set(equipoIds).size !== equipoIds.length) {
    throw new Error('Hay equipos repetidos en la lista');
  }

  const participantes: (number | null)[] = [...equipoIds];
  if (participantes.length % 2 !== 0) {
    participantes.push(null);
  }

  const total = participantes.length;
  const cantidadFechas = total - 1;
  const ida: FechaGenerada[] = [];

  for (let ronda = 0; ronda < cantidadFechas; ronda++) {
    const partidos: PartidoGenerado[] = [];
    let equipoLibreId: number | null = null;

    for (let i = 0; i < total / 2; i++) {
      let a = participantes[i] ?? null;
      let b = participantes[total - 1 - i] ?? null;

      // El equipo fijo alterna de lado para no ser siempre el mismo A
      if (i === 0 && ronda % 2 === 1) {
        [a, b] = [b, a];
      }

      if (a === null) {
        equipoLibreId = b;
      } else if (b === null) {
        equipoLibreId = a;
      } else {
        partidos.push({ equipoAId: a, equipoBId: b });
      }
    }

    ida.push({ numero: ronda + 1, partidos, equipoLibreId });

    // Rotación: el último pasa a la segunda posición
    participantes.splice(1, 0, participantes.pop() ?? null);
  }

  if (!dobleVuelta) {
    return ida;
  }

  // Vuelta: mismas fechas con local y visitante invertidos, numeradas a continuación
  const vuelta: FechaGenerada[] = ida.map((fecha) => ({
    numero: fecha.numero + cantidadFechas,
    partidos: fecha.partidos.map((partido) => ({
      equipoAId: partido.equipoBId,
      equipoBId: partido.equipoAId,
    })),
    equipoLibreId: fecha.equipoLibreId,
  }));

  return [...ida, ...vuelta];
}
