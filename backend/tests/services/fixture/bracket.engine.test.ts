import { describe, expect, it } from 'vitest';
import {
  asignarEquipos,
  calcularTamanoBracket,
  generarBracket,
  sortearParticipantes,
  type PartidoBracket,
} from '@services/fixture/bracket.engine';

const deRonda = <T extends PartidoBracket>(partidos: T[], ronda: number): T[] =>
  partidos.filter((partido) => partido.ronda === ronda);

describe('calcularTamanoBracket', () => {
  it.each([
    [2, 2],
    [3, 4],
    [4, 4],
    [5, 8],
    [7, 8],
    [8, 8],
    [9, 16],
    [20, 32],
  ])('con %i participantes el bracket es de %i', (participantes, esperado) => {
    expect(calcularTamanoBracket(participantes)).toBe(esperado);
  });
});

describe('generarBracket - tamaño y byes', () => {
  it('con 7 participantes arma un bracket de 8 con 1 bye', () => {
    const bracket = generarBracket(7);

    expect(bracket.tamano).toBe(8);
    expect(bracket.byes).toBe(1);
    expect(bracket.cantidadRondas).toBe(3);
    expect(bracket.partidos.filter((p) => p.esBye)).toHaveLength(1);
  });

  it('con potencia de 2 no hay byes', () => {
    const bracket = generarBracket(8);

    expect(bracket.byes).toBe(0);
    expect(bracket.partidos.some((p) => p.esBye)).toBe(false);
  });

  it.each([2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 20, 33])(
    'con %i participantes hay tamano - 1 partidos y tantos byes como lugares vacíos',
    (n) => {
      const bracket = generarBracket(n);

      expect(bracket.partidos).toHaveLength(bracket.tamano - 1);
      expect(bracket.byes).toBe(bracket.tamano - n);
      expect(bracket.partidos.filter((p) => p.esBye)).toHaveLength(bracket.byes);
    },
  );

  it('los byes les tocan a las semillas más altas, en partidos distintos', () => {
    const bracket = generarBracket(5);
    const byes = bracket.partidos.filter((p) => p.esBye);

    // Tamaño 8 con 5 participantes: 3 byes para las semillas 1, 2 y 3
    expect(byes.map((p) => p.semillaA).sort()).toEqual([1, 2, 3]);
    byes.forEach((p) => expect(p.semillaB).toBeNull());
  });

  it('un partido normal de primera ronda tiene las dos semillas', () => {
    const bracket = generarBracket(7);

    deRonda(bracket.partidos, 1)
      .filter((p) => !p.esBye)
      .forEach((p) => {
        expect(p.semillaA).not.toBeNull();
        expect(p.semillaB).not.toBeNull();
      });
  });
});

describe('generarBracket - semillas', () => {
  it('con 8 participantes cruza 1-8, 4-5, 2-7 y 3-6', () => {
    const cruces = deRonda(generarBracket(8).partidos, 1).map((p) => [
      p.semillaA,
      p.semillaB,
    ]);

    expect(cruces).toEqual([
      [1, 8],
      [4, 5],
      [2, 7],
      [3, 6],
    ]);
  });

  it('cada semilla aparece una sola vez en la primera ronda', () => {
    const bracket = generarBracket(11);
    const semillas = deRonda(bracket.partidos, 1)
      .flatMap((p) => [p.semillaA, p.semillaB])
      .filter((s): s is number => s !== null)
      .sort((x, y) => x - y);

    expect(semillas).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
  });

  it('las rondas siguientes no tienen semillas cargadas', () => {
    const bracket = generarBracket(8);

    bracket.partidos
      .filter((p) => p.ronda > 1)
      .forEach((p) => {
        expect(p.semillaA).toBeNull();
        expect(p.semillaB).toBeNull();
      });
  });
});

describe('generarBracket - rondas encadenadas', () => {
  it('cada ronda tiene la mitad de partidos que la anterior', () => {
    const bracket = generarBracket(16);

    expect([1, 2, 3, 4].map((r) => deRonda(bracket.partidos, r).length)).toEqual([
      8, 4, 2, 1,
    ]);
  });

  it('numera los partidos de cada ronda desde 1 y los ordena por ronda', () => {
    const bracket = generarBracket(8);

    bracket.partidos.forEach((p, i) => expect(p.indice).toBe(i));
    expect(deRonda(bracket.partidos, 1).map((p) => p.numeroEnRonda)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(bracket.partidos.map((p) => p.ronda)).toEqual([1, 1, 1, 1, 2, 2, 3]);
  });

  it('dos partidos consecutivos pasan al mismo partido de la ronda siguiente, uno por lado', () => {
    const bracket = generarBracket(8);
    const [p1, p2, p3, p4] = deRonda(bracket.partidos, 1);

    expect(p1?.siguienteIndice).toBe(4);
    expect(p2?.siguienteIndice).toBe(4);
    expect(p3?.siguienteIndice).toBe(5);
    expect(p4?.siguienteIndice).toBe(5);
    expect([p1, p2, p3, p4].map((p) => p?.ladoSiguiente)).toEqual([
      'A',
      'B',
      'A',
      'B',
    ]);
  });

  it('la semifinal apunta a la final y la final no tiene siguiente', () => {
    const bracket = generarBracket(8);
    const final = bracket.partidos[bracket.partidos.length - 1];

    deRonda(bracket.partidos, 2).forEach((p) => expect(p.siguienteIndice).toBe(6));
    expect(final?.siguienteIndice).toBeNull();
    expect(final?.ladoSiguiente).toBeNull();
  });

  it.each([2, 3, 6, 7, 13, 16, 25])(
    'con %i participantes todo partido salvo la final apunta a un partido de la ronda siguiente y cada lado se usa una vez',
    (n) => {
      const bracket = generarBracket(n);
      const lados = new Set<string>();

      bracket.partidos.forEach((p) => {
        if (p.ronda === bracket.cantidadRondas) {
          expect(p.siguienteIndice).toBeNull();
          return;
        }
        const siguiente = bracket.partidos[p.siguienteIndice ?? -1];
        expect(siguiente?.ronda).toBe(p.ronda + 1);
        lados.add(`${p.siguienteIndice}-${p.ladoSiguiente}`);
      });

      // Cada partido que no es de primera ronda recibe exactamente 2 ganadores
      expect(lados.size).toBe(bracket.partidos.length - 1);
    },
  );

  it('con 2 participantes hay una sola ronda y es la final', () => {
    const bracket = generarBracket(2);

    expect(bracket.partidos).toHaveLength(1);
    expect(bracket.partidos[0]?.instancia).toBe('final');
  });
});

describe('generarBracket - instancias', () => {
  it('nombra las rondas desde la final hacia atrás', () => {
    const bracket = generarBracket(16);
    const nombres = [1, 2, 3, 4].map((r) => deRonda(bracket.partidos, r)[0]?.instancia);

    expect(nombres).toEqual(['octavos', 'cuartos', 'semifinal', 'final']);
  });

  it('con 7 participantes la primera ronda son los cuartos', () => {
    expect(generarBracket(7).partidos[0]?.instancia).toBe('cuartos');
  });

  it('pasadas las 7 rondas usa un nombre genérico', () => {
    const bracket = generarBracket(256);

    expect(deRonda(bracket.partidos, 1)[0]?.instancia).toBe('ronda_1');
    expect(deRonda(bracket.partidos, 2)[0]?.instancia).toBe('sesentaicuatroavos');
  });
});

describe('generarBracket - validaciones', () => {
  it.each([0, 1, -3, 2.5, Number.NaN])(
    'con %s participantes lanza error',
    (n) => {
      expect(() => generarBracket(n)).toThrow(
        'Se necesitan al menos 2 participantes'
      );
    },
  );
});

describe('sortearParticipantes', () => {
  it('devuelve los mismos equipos sin modificar la lista original', () => {
    const original = [1, 2, 3, 4, 5];
    const sorteados = sortearParticipantes(original);

    expect([...sorteados].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it('ordena según el número aleatorio que le toca a cada equipo', () => {
    const valores = [0.9, 0.1, 0.5];
    let llamada = 0;
    const aleatorio = (): number => valores[llamada++] ?? 0;

    expect(sortearParticipantes([1, 2, 3], aleatorio)).toEqual([2, 3, 1]);
  });
});

describe('asignarEquipos', () => {
  // Equipos con ids 11..(10+n); el 11 es la semilla 1
  const equipos = (cantidad: number): number[] =>
    Array.from({ length: cantidad }, (_, i) => i + 11);

  it('con 8 equipos ubica a todos en la primera ronda y no hay ganadores', () => {
    const partidos = asignarEquipos(generarBracket(8), equipos(8));
    const primera = deRonda(partidos, 1);

    expect(primera.map((p) => [p.equipoAId, p.equipoBId])).toEqual([
      [11, 18],
      [14, 15],
      [12, 17],
      [13, 16],
    ]);
    partidos.forEach((p) => expect(p.ganadorId).toBeNull());
    partidos
      .filter((p) => p.ronda > 1)
      .forEach((p) => {
        expect(p.equipoAId).toBeNull();
        expect(p.equipoBId).toBeNull();
      });
  });

  it('con 7 equipos el bye deja equipo B vacío y ganador automático', () => {
    const partidos = asignarEquipos(generarBracket(7), equipos(7));
    const bye = partidos.find((p) => p.esBye);

    expect(bye?.equipoAId).toBe(11);
    expect(bye?.equipoBId).toBeNull();
    expect(bye?.ganadorId).toBe(11);
  });

  it('el equipo con bye se promueve al lado que indica siguienteIndice', () => {
    const partidos = asignarEquipos(generarBracket(7), equipos(7));
    const bye = partidos.find((p) => p.esBye);
    const siguiente = partidos[bye?.siguienteIndice ?? -1];

    expect(siguiente?.ronda).toBe(2);
    expect(siguiente?.equipoAId).toBe(11);
    // El otro lado espera al ganador del partido que sí se juega
    expect(siguiente?.equipoBId).toBeNull();
  });

  it('los partidos que se juegan quedan sin ganador', () => {
    const partidos = asignarEquipos(generarBracket(7), equipos(7));

    partidos
      .filter((p) => !p.esBye)
      .forEach((p) => expect(p.ganadorId).toBeNull());
  });

  it('con 5 equipos hay 3 byes y dos equipos promovidos pueden quedar enfrentados', () => {
    const bracket = generarBracket(5);
    const partidos = asignarEquipos(bracket, equipos(5));
    const byes = partidos.filter((p) => p.esBye);

    expect(byes).toHaveLength(3);
    byes.forEach((p) => expect(p.ganadorId).toBe(p.equipoAId));
    // Los byes de las semillas 2 y 3 son consecutivos: sus equipos se cruzan en semifinal
    const semifinal = deRonda(partidos, 2)[1];
    expect([semifinal?.equipoAId, semifinal?.equipoBId]).toEqual([12, 13]);
  });

  it('cada equipo aparece una sola vez en la primera ronda', () => {
    const ids = deRonda(asignarEquipos(generarBracket(11), equipos(11)), 1)
      .flatMap((p) => [p.equipoAId, p.equipoBId])
      .filter((id): id is number => id !== null)
      .sort((a, b) => a - b);

    expect(ids).toEqual(equipos(11));
  });

  it('lanza error si la cantidad de equipos no coincide con el bracket', () => {
    expect(() => asignarEquipos(generarBracket(7), equipos(6))).toThrow(
      'El bracket es para 7 equipos y llegaron 6'
    );
  });

  it('lanza error si hay equipos repetidos', () => {
    expect(() => asignarEquipos(generarBracket(4), [1, 2, 2, 3])).toThrow(
      'Hay equipos repetidos'
    );
  });
});
