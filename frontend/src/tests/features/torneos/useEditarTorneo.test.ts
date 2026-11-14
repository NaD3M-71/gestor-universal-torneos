import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEditarTorneo } from "@features/torneos/hooks/useEditarTorneo";
import * as torneoService from "@features/torneos/service/torneoService";
import * as equipoService from "@features/equipos/service/equipoService";
import type { Torneo } from "@features/torneos/types/torneo.types";
import type { Equipo } from "@features/equipos/types/equipo.types";

// 1. Mock de react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "30" }),
  useNavigate: () => mockNavigate,
}));

// 2. Mock de servicios
vi.mock("@features/torneos/service/torneoService");
vi.mock("@features/equipos/service/equipoService");

// Datos base de prueba
const mockTorneoGrupos = {
  id: 30,
  creadorId: 10,
  nombre: "Copa UTN",
  descripcion: null,
  formato: "grupos_eliminatorias",
  sistemaPuntuacion: "futbol_clasico",
  cantidadParticipantes: 8,
  cantidadGrupos: 2,
  estado: "borrador",
  fechaInicio: null,
  campeonId: null,
} as Torneo;

const mockEquiposIniciales: Equipo[] = [
  {
    id: 1,
    torneoId: 30,
    nombre: "Los Del Fondo",
    grupo: 1,
    integrantes: [{ id: 101, nombre: "Lucas Gómez" }],
  },
  {
    id: 2,
    torneoId: 30,
    nombre: "Cerveceros FC",
    grupo: 2,
    integrantes: [{ id: 102, nombre: "Matías Rossi" }],
  },
];

describe("useEditarTorneo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(torneoService.obtenerTorneo).mockResolvedValue(mockTorneoGrupos);
    vi.mocked(equipoService.obtenerEquipos).mockResolvedValue(
      mockEquiposIniciales,
    );
  });

  it("debe cargar inicialmente los datos del torneo y mapear las asignaciones de grupo", async () => {
    const { result } = renderHook(() => useEditarTorneo());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.torneo?.nombre).toBe("Copa UTN");
    expect(result.current.equipos).toHaveLength(2);
    expect(result.current.asignacionesGrupos).toEqual({
      1: 1,
      2: 2,
    });
  });

  it("debe agregar un equipo con integrantes parseados y actualizar el estado optimista sin parpadeo", async () => {
    const nuevoEquipoMock: Equipo = {
      id: 3,
      torneoId: 30,
      nombre: "Tiki Tiki",
      grupo: null,
      integrantes: [
        { id: 103, nombre: "Lionel Scaloni" },
        { id: 104, nombre: "Pablo Aimar" },
      ],
    };
    vi.mocked(equipoService.crearEquipo).mockResolvedValue(nuevoEquipoMock);

    const { result } = renderHook(() => useEditarTorneo());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setNombreEquipo("  Tiki Tiki  ");
      result.current.setIntegrantesInput("Lionel Scaloni, , Pablo Aimar  ");
    });

    await act(async () => {
      await result.current.handleAgregarEquipo({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    // Verifica payload limpio enviado al backend
    expect(equipoService.crearEquipo).toHaveBeenCalledWith(30, {
      nombre: "Tiki Tiki",
      integrantes: ["Lionel Scaloni", "Pablo Aimar"],
    });

    // Verifica actualización local inmediata y loading intacto
    expect(result.current.loading).toBe(false);
    expect(result.current.equipos).toHaveLength(3);
    expect(result.current.asignacionesGrupos[3]).toBeNull();
    expect(result.current.nombreEquipo).toBe("");
    expect(result.current.toastMessage).toContain("Tiki Tiki");
  });

  it("debe abrir modal de confirmación y eliminar el equipo al confirmar", async () => {
    vi.mocked(equipoService.eliminarEquipo).mockResolvedValue(undefined);

    const { result } = renderHook(() => useEditarTorneo());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Solicita eliminación -> abre modal
    act(() => {
      result.current.handleEliminarEquipo(mockEquiposIniciales[0].id);
    });

    expect(result.current.modalConfig.isOpen).toBe(true);
    expect(result.current.modalConfig.variant).toBe("danger");

    // Confirma en el modal
    await act(async () => {
      await result.current.modalConfig.onConfirm();
    });

    expect(equipoService.eliminarEquipo).toHaveBeenCalledWith(30, 1);
    expect(result.current.equipos).toHaveLength(1);
    expect(result.current.asignacionesGrupos[1]).toBeUndefined();
    expect(result.current.modalConfig.isOpen).toBe(false);
  });

  it("debe bloquear el guardado si hay equipos sin grupo o grupos desbalanceados", async () => {
    const equiposDesbalanceados: Equipo[] = [
      { id: 1, torneoId: 30, nombre: "Eq 1", grupo: 1, integrantes: [] },
      { id: 2, torneoId: 30, nombre: "Eq 2", grupo: 1, integrantes: [] },
      { id: 3, torneoId: 30, nombre: "Eq 3", grupo: 1, integrantes: [] },
      { id: 4, torneoId: 30, nombre: "Eq 4", grupo: 2, integrantes: [] },
    ];
    vi.mocked(equipoService.obtenerEquipos).mockResolvedValue(
      equiposDesbalanceados,
    );

    const { result } = renderHook(() => useEditarTorneo());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Intentar guardar con Grupo 1 (3 equipos) vs Grupo 2 (1 equipo) -> diferencia > 1
    await act(async () => {
      await result.current.handleGuardarGrupos();
    });

    expect(equipoService.asignarGrupos).not.toHaveBeenCalled();
    expect(result.current.error).toContain("desbalanceados");
  });

  it("debe sortear grupos y sincronizar el diccionario local", async () => {
    const equiposSorteados: Equipo[] = [
      { ...mockEquiposIniciales[0], grupo: 2 },
      { ...mockEquiposIniciales[1], grupo: 1 },
    ];
    vi.mocked(equipoService.sortearGrupos).mockResolvedValue(equiposSorteados);

    const { result } = renderHook(() => useEditarTorneo());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSortearGrupos();
    });

    expect(equipoService.sortearGrupos).toHaveBeenCalledWith(30);
    expect(result.current.asignacionesGrupos).toEqual({ 1: 2, 2: 1 });
    expect(result.current.toastMessage).toContain("Sorteo de grupos realizado");
  });

  it("debe mostrar advertencia en el modal al iniciar con menos participantes que el cupo configurado", async () => {
    vi.mocked(torneoService.iniciarTorneo).mockResolvedValue({} as never);

    const { result } = renderHook(() => useEditarTorneo());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Torneo configurado para 8, pero hay 2 inscriptos
    act(() => {
      result.current.handleIniciarTorneo();
    });

    expect(result.current.modalConfig.isOpen).toBe(true);
    expect(result.current.modalConfig.variant).toBe("warning");
    expect(result.current.modalConfig.message).toContain("límite máximo de 8");
    expect(result.current.modalConfig.message).toContain(
      "2 equipos inscriptos",
    );

    await act(async () => {
      await result.current.modalConfig.onConfirm();
    });

    expect(torneoService.iniciarTorneo).toHaveBeenCalledWith(30);
    expect(mockNavigate).toHaveBeenCalledWith("/torneos");
  });

  it("debe extraer y mostrar el mensaje específico de 'detalles' cuando falla el inicio en el backend", async () => {
    vi.mocked(torneoService.iniciarTorneo).mockRejectedValue({
      response: {
        data: {
          error: {
            mensaje: "Los datos enviados no son válidos.",
            detalles: [
              {
                campo: "cantidadParticipantes",
                mensaje: "Con 8 grupos hacen falta al menos 16 participantes.",
              },
            ],
          },
        },
      },
    });

    const { result } = renderHook(() => useEditarTorneo());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleIniciarTorneo();
    });

    await act(async () => {
      await result.current.modalConfig.onConfirm();
    });

    expect(result.current.error).toBe(
      "Con 8 grupos hacen falta al menos 16 participantes.",
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
