import { describe, it, expect } from "vitest";
import {
  esPotenciaDeDos,
  calcularLlaveAsimetrica,
  obtenerNombreRonda,
} from "@features/torneos/utils/torneoCalculos";

describe("Utilidades matemáticas de torneos", () => {
  describe("esPotenciaDeDos", () => {
    it("debe retornar true para potencias válidas de 2", () => {
      expect(esPotenciaDeDos(1)).toBe(true); // 2^0 = 1
      expect(esPotenciaDeDos(2)).toBe(true);
      expect(esPotenciaDeDos(4)).toBe(true);
      expect(esPotenciaDeDos(8)).toBe(true);
      expect(esPotenciaDeDos(16)).toBe(true);
      expect(esPotenciaDeDos(32)).toBe(true);
    });

    it("debe retornar false para números que no son potencia de 2", () => {
      expect(esPotenciaDeDos(0)).toBe(false);
      expect(esPotenciaDeDos(3)).toBe(false);
      expect(esPotenciaDeDos(5)).toBe(false);
      expect(esPotenciaDeDos(6)).toBe(false);
      expect(esPotenciaDeDos(10)).toBe(false);
      expect(esPotenciaDeDos(12)).toBe(false);
    });
  });

  describe("calcularLlaveAsimetrica", () => {
    it("retorna null si los participantes ya forman una potencia exacta de 2", () => {
      expect(calcularLlaveAsimetrica(4)).toBeNull();
      expect(calcularLlaveAsimetrica(8)).toBeNull();
      expect(calcularLlaveAsimetrica(16)).toBeNull();
    });

    it("calcula correctamente los byes para 12 equipos (próxima potencia 16)", () => {
      const resultado = calcularLlaveAsimetrica(12);
      expect(resultado).not.toBeNull();
      expect(resultado?.byes).toBe(4);
      expect(resultado?.jueganPrimeraRonda).toBe(8);
      expect(resultado?.nombreRondaObjetivo).toBe("Cuartos de Final");
    });

    it("calcula correctamente los byes para 7 equipos (próxima potencia 8)", () => {
      const resultado = calcularLlaveAsimetrica(7);
      expect(resultado?.byes).toBe(1);
      expect(resultado?.jueganPrimeraRonda).toBe(6);
      expect(resultado?.nombreRondaObjetivo).toBe("Semifinales");
    });

    it("calcula correctamente los byes para 10 equipos (próxima potencia 16)", () => {
      const resultado = calcularLlaveAsimetrica(10);
      expect(resultado?.byes).toBe(6);
      expect(resultado?.jueganPrimeraRonda).toBe(4);
      expect(resultado?.nombreRondaObjetivo).toBe("Cuartos de Final");
    });
  });

  describe("obtenerNombreRonda", () => {
    it("devuelve los nombres clásicos según los clasificados", () => {
      expect(obtenerNombreRonda(2)).toBe("la Final");
      expect(obtenerNombreRonda(4)).toBe("Semifinales");
      expect(obtenerNombreRonda(8)).toBe("Cuartos de Final");
      expect(obtenerNombreRonda(16)).toBe("Octavos de Final");
      expect(obtenerNombreRonda(32)).toBe("16avos de Final");
    });
  });
});
