import { describe, expect, it } from 'vitest';
import {
  generarRoundRobin,
  type FechaGenerada,
} from '@services/fixture/roundRobin.engine';

// Equipos con ids 1..n
const equipos = (cantidad: number): number[] =>
  Array.from({ length: cantidad }, (_, i) => i + 1);

const contarPartidos = (fechas: FechaGenerada[]): number =>
  fechas.reduce((total, fecha) => total + fecha.partidos.length, 0);

// Cuántas veces aparece cada par (sin importar quién es A o B), con clave "menor-mayor"
const contarEnfrentamientos = (fechas: FechaGenerada[]): Map<string, number> => {
  const conteo = new Map<string, number>();
  fechas.forEach((fecha) =>
    fecha.partidos.forEach((partido) => {
      const clave = [partido.equipoAId, partido.equipoBId]
        .sort((x, y) => x - y)
        .join('-');
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
    }),
  );
  return conteo;
};

describe('generarRoundRobin - liga simple', () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 11])(
    'con %i equipos genera N x (N-1) / 2 partidos',
    (n) => {
      const fechas = generarRoundRobin(equipos(n), false);

      expect(contarPartidos(fechas)).toBe((n * (n - 1)) / 2);
    },
  );

  it('con cantidad par genera N-1 fechas sin equipo libre', () => {
    const fechas = generarRoundRobin(equipos(6), false);

    expect(fechas).toHaveLength(5);
    fechas.forEach((fecha) => {
      expect(fecha.partidos).toHaveLength(3);
      expect(fecha.equipoLibreId).toBeNull();
    });
  });

  it('con cantidad impar genera N fechas y un equipo libre por fecha', () => {
    const fechas = generarRoundRobin(equipos(5), false);

    expect(fechas).toHaveLength(5);
    fechas.forEach((fecha) => {
      expect(fecha.partidos).toHaveLength(2);
      expect(fecha.equipoLibreId).not.toBeNull();
    });
  });

  it('con cantidad impar cada equipo descansa exactamente una vez', () => {
    const fechas = generarRoundRobin(equipos(7), false);
    const libres = fechas.map((fecha) => fecha.equipoLibreId);

    expect([...libres].sort((x, y) => (x ?? 0) - (y ?? 0))).toEqual(equipos(7));
  });

  it.each([2, 3, 4, 5, 8, 9])(
    'con %i equipos cada par se enfrenta exactamente una vez',
    (n) => {
      const conteo = contarEnfrentamientos(generarRoundRobin(equipos(n), false));

      expect(conteo.size).toBe((n * (n - 1)) / 2);
      conteo.forEach((veces) => expect(veces).toBe(1));
    },
  );

  it.each([4, 5, 8, 9])(
    'con %i equipos ningun equipo juega dos veces en la misma fecha',
    (n) => {
      generarRoundRobin(equipos(n), false).forEach((fecha) => {
        const jugadores = fecha.partidos.flatMap((partido) => [
          partido.equipoAId,
          partido.equipoBId,
        ]);

        expect(new Set(jugadores).size).toBe(jugadores.length);
        // Quien descansa no puede aparecer en un partido de esa fecha
        if (fecha.equipoLibreId !== null) {
          expect(jugadores).not.toContain(fecha.equipoLibreId);
        }
      });
    },
  );

  it('con 2 equipos genera una sola fecha con un partido', () => {
    const fechas = generarRoundRobin([10, 20], false);

    expect(fechas).toHaveLength(1);
    expect(fechas[0]?.numero).toBe(1);
    expect(fechas[0]?.partidos).toHaveLength(1);
    expect(fechas[0]?.equipoLibreId).toBeNull();
  });

  it('numera las fechas desde 1 de forma consecutiva', () => {
    const fechas = generarRoundRobin(equipos(6), false);

    expect(fechas.map((fecha) => fecha.numero)).toEqual([1, 2, 3, 4, 5]);
  });

  it('usa los ids recibidos y no los asume correlativos', () => {
    const ids = [101, 205, 307, 412];
    const fechas = generarRoundRobin(ids, false);

    fechas.forEach((fecha) =>
      fecha.partidos.forEach((partido) => {
        expect(ids).toContain(partido.equipoAId);
        expect(ids).toContain(partido.equipoBId);
      }),
    );
  });

  it('no modifica la lista de equipos recibida', () => {
    const ids = [3, 1, 2];
    generarRoundRobin(ids, false);

    expect(ids).toEqual([3, 1, 2]);
  });
});

describe('generarRoundRobin - liga doble', () => {
  it.each([2, 3, 4, 5, 6, 7])(
    'con %i equipos genera N x (N-1) partidos',
    (n) => {
      const fechas = generarRoundRobin(equipos(n), true);

      expect(contarPartidos(fechas)).toBe(n * (n - 1));
    },
  );

  it('con cantidad par genera 2 x (N-1) fechas', () => {
    const fechas = generarRoundRobin(equipos(4), true);

    expect(fechas).toHaveLength(6);
    expect(fechas.map((fecha) => fecha.numero)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('con cantidad impar genera 2 x N fechas', () => {
    const fechas = generarRoundRobin(equipos(5), true);

    expect(fechas).toHaveLength(10);
    expect(fechas.map((fecha) => fecha.numero)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it.each([2, 3, 4, 5, 8])(
    'con %i equipos cada par se enfrenta dos veces',
    (n) => {
      const conteo = contarEnfrentamientos(generarRoundRobin(equipos(n), true));

      expect(conteo.size).toBe((n * (n - 1)) / 2);
      conteo.forEach((veces) => expect(veces).toBe(2));
    },
  );

  it('la vuelta repite las fechas de la ida con local y visitante invertidos', () => {
    const fechas = generarRoundRobin(equipos(4), true);
    const ida = fechas.slice(0, 3);
    const vuelta = fechas.slice(3);

    ida.forEach((fechaIda, indice) => {
      const fechaVuelta = vuelta[indice];

      expect(fechaVuelta?.partidos).toEqual(
        fechaIda.partidos.map((partido) => ({
          equipoAId: partido.equipoBId,
          equipoBId: partido.equipoAId,
        })),
      );
      expect(fechaVuelta?.equipoLibreId).toBe(fechaIda.equipoLibreId);
    });
  });

  it('cada equipo juega una vez de local y una de visitante contra cada rival', () => {
    const fechas = generarRoundRobin(equipos(5), true);
    const dirigidos = new Set<string>();

    fechas.forEach((fecha) =>
      fecha.partidos.forEach((partido) =>
        dirigidos.add(`${partido.equipoAId}>${partido.equipoBId}`),
      ),
    );

    // 5 x 4 = 20 combinaciones local-visitante distintas
    expect(dirigidos.size).toBe(20);
  });
});

describe('generarRoundRobin - validaciones', () => {
  it('rechaza una lista vacia', () => {
    expect(() => generarRoundRobin([], false)).toThrow();
  });

  it('rechaza un solo equipo', () => {
    expect(() => generarRoundRobin([1], true)).toThrow();
  });

  it('rechaza ids repetidos', () => {
    expect(() => generarRoundRobin([1, 2, 2, 3], false)).toThrow();
  });
});
