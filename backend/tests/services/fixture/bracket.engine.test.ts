import { describe, expect, it } from 'vitest';
import {
  calcularTamanoBracket,
  generarBracket,
  type PartidoBracket,
} from '@services/fixture/bracket.engine';

const deRonda = (partidos: PartidoBracket[], ronda: number): PartidoBracket[] =>
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
