export const esPotenciaDeDos = (n: number): boolean =>
  n > 0 && (n & (n - 1)) === 0;

export interface InfoLlaveAsimetrica {
  byes: number;
  jueganPrimeraRonda: number;
  proximaPotencia: number;
  nombreRondaObjetivo: string;
}

export const obtenerNombreRonda = (totalEquiposEnRonda: number): string => {
  switch (totalEquiposEnRonda) {
    case 2:
      return "la Final";
    case 4:
      return "Semifinales";
    case 8:
      return "Cuartos de Final";
    case 16:
      return "Octavos de Final";
    case 32:
      return "16avos de Final";
    case 64:
      return "32avos de Final";
    default:
      return `ronda de ${totalEquiposEnRonda} equipos`;
  }
};

export const calcularLlaveAsimetrica = (
  equipos: number,
): InfoLlaveAsimetrica | null => {
  if (equipos <= 1 || esPotenciaDeDos(equipos)) return null;
  let proximaPotencia = 2;
  while (proximaPotencia < equipos) {
    proximaPotencia *= 2;
  }

  const byes = proximaPotencia - equipos;
  const jueganPrimeraRonda = equipos - byes;
  const nombreRondaObjetivo = obtenerNombreRonda(proximaPotencia / 2);

  return { byes, jueganPrimeraRonda, proximaPotencia, nombreRondaObjetivo };
};
