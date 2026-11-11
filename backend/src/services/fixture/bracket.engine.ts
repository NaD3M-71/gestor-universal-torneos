// Motor de eliminación simple. Función pura: no usa BD.
//
// Solo arma la estructura del cuadro: cuántos partidos hay, cuáles son bye y
// cómo se encadenan las rondas. Quién ocupa cada semilla (sorteo o ranking de
// una fase previa) se resuelve afuera: la semilla 1 es el primer equipo de
// esa lista, la 2 el segundo, y así.

export interface PartidoBracket {
  // Posición dentro de Bracket.partidos. Sirve de id provisorio hasta que
  // los partidos se guarden en la BD y existan los ids reales.
  indice: number;
  ronda: number; // 1 = primera ronda
  numeroEnRonda: number; // 1..n dentro de la ronda
  instancia: string; // octavos, cuartos, semifinal, final...
  // Solo se completan en la primera ronda. semillaB en null significa bye.
  semillaA: number | null;
  semillaB: number | null;
  esBye: boolean;
  // Partido de la ronda siguiente al que pasa el ganador (null en la final)
  // y lado en el que entra (equipo A o equipo B).
  siguienteIndice: number | null;
  ladoSiguiente: 'A' | 'B' | null;
}

export interface Bracket {
  tamano: number; // potencia de 2 igual o superior a la cantidad de participantes
  byes: number;
  cantidadRondas: number;
  partidos: PartidoBracket[]; // ordenados por ronda y por numeroEnRonda
}

// De la final hacia atrás. Pasadas las 7 rondas se usa un nombre genérico.
const NOMBRES_INSTANCIA = [
  'final',
  'semifinal',
  'cuartos',
  'octavos',
  'dieciseisavos',
  'treintaidosavos',
  'sesentaicuatroavos',
];

// Potencia de 2 igual o superior a la cantidad de participantes
export function calcularTamanoBracket(cantidadParticipantes: number): number {
  let tamano = 2;
  while (tamano < cantidadParticipantes) {
    tamano *= 2;
  }
  return tamano;
}

// Orden de las semillas en la primera ronda, de a pares: con 8 queda
// [1, 8, 4, 5, 2, 7, 3, 6]. Así las semillas más altas se cruzan lo más tarde
// posible (la 1 y la 2 solo se ven en la final) y los byes caen en las
// semillas 1, 2, 3... (las que le sobran al tamaño).
function ordenarSemillas(tamano: number): number[] {
  let semillas = [1, 2];
  while (semillas.length < tamano) {
    const total = semillas.length * 2;
    semillas = semillas.flatMap((semilla) => [semilla, total + 1 - semilla]);
  }
  return semillas;
}

function nombreInstancia(ronda: number, cantidadRondas: number): string {
  return NOMBRES_INSTANCIA[cantidadRondas - ronda] ?? `ronda_${ronda}`;
}

export function generarBracket(cantidadParticipantes: number): Bracket {
  if (!Number.isInteger(cantidadParticipantes) || cantidadParticipantes < 2) {
    throw new Error(
      'Se necesitan al menos 2 participantes para generar el bracket'
    );
  }

  const tamano = calcularTamanoBracket(cantidadParticipantes);
  const byes = tamano - cantidadParticipantes;
  const cantidadRondas = Math.log2(tamano);
  const semillas = ordenarSemillas(tamano);
  const partidos: PartidoBracket[] = [];

  // Partidos por ronda: tamano/2 en la primera, la mitad en cada una siguiente
  let partidosEnRonda = tamano / 2;
  let inicioRonda = 0;

  for (let ronda = 1; ronda <= cantidadRondas; ronda++) {
    // Los partidos de la ronda siguiente empiezan justo después de esta
    const inicioSiguiente = inicioRonda + partidosEnRonda;

    for (let i = 0; i < partidosEnRonda; i++) {
      const esFinal = ronda === cantidadRondas;
      const semillaA = ronda === 1 ? (semillas[2 * i] ?? null) : null;
      const semillaB = ronda === 1 ? (semillas[2 * i + 1] ?? null) : null;
      // Las semillas mayores a la cantidad real de participantes no existen
      const hayB = semillaB !== null && semillaB <= cantidadParticipantes;

      partidos.push({
        indice: inicioRonda + i,
        ronda,
        numeroEnRonda: i + 1,
        instancia: nombreInstancia(ronda, cantidadRondas),
        semillaA,
        semillaB: hayB ? semillaB : null,
        esBye: ronda === 1 && !hayB,
        // Dos partidos consecutivos alimentan a uno de la ronda siguiente
        siguienteIndice: esFinal ? null : inicioSiguiente + Math.floor(i / 2),
        ladoSiguiente: esFinal ? null : i % 2 === 0 ? 'A' : 'B',
      });
    }

    inicioRonda = inicioSiguiente;
    partidosEnRonda /= 2;
  }

  return { tamano, byes, cantidadRondas, partidos };
}
