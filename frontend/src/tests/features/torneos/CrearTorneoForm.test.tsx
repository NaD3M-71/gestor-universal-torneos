import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { CrearTorneoView } from "@features/torneos/views/CrearTorneoView";
import * as torneoService from "@features/torneos/service/torneoService";

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <CrearTorneoView />
    </BrowserRouter>,
  );
};

describe("CrearTorneoView (Formulario)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("debe mostrar error de validación si el nombre está vacío al intentar enviar", async () => {
    const crearTorneoSpy = vi
      .spyOn(torneoService, "crearTorneo")
      .mockResolvedValue({ id: 1 } as unknown as Awaited<
        ReturnType<typeof torneoService.crearTorneo>
      >);
    const user = userEvent.setup();
    renderComponent();

    const submitBtn = screen.getByRole("button", { name: /crear torneo/i });
    await user.click(submitBtn);

    expect(
      await screen.findByText(/el nombre es obligatorio/i),
    ).toBeInTheDocument();
    expect(crearTorneoSpy).not.toHaveBeenCalled();
  });

  it("calcula automáticamente el total de participantes en Fase de Grupos", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Seleccionar select de formato por su name
    const formatoSelect = screen.getByDisplayValue(/liga simple/i);
    await user.selectOptions(formatoSelect, "grupos_eliminatorias");

    // Seleccionar 4 Grupos
    const gruposSelect = screen.getByDisplayValue(/seleccionar\.\.\./i);
    await user.selectOptions(gruposSelect, "4");

    // Ingresar 5 equipos por grupo (buscamos por su placeholder)
    const equiposPorGrupoInput = screen.getByPlaceholderText(/ej: 4/i);
    await user.clear(equiposPorGrupoInput);
    await user.type(equiposPorGrupoInput, "5");

    // Verificar recálculo dinámico: 4 x 5 = 20
    expect(await screen.findByText(/20 equipos/i)).toBeInTheDocument();

    // Verificar advertencia de grupos impares
    expect(
      screen.getByText(/al ser zonas con participantes impares/i),
    ).toBeInTheDocument();
  });

  it("muestra la advertencia de llave asimétrica si los clasificados no son potencia de 2", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Formato Liguilla + Playoffs
    const formatoSelect = screen.getByDisplayValue(/liga simple/i);
    await user.selectOptions(formatoSelect, "liguilla_eliminacion");

    // Equipos en fase regular: 16
    const participantesInput = screen.getByPlaceholderText(/ej: 16/i);
    await user.clear(participantesInput);
    await user.type(participantesInput, "16");

    // Clasifican a Playoffs: 10
    const corteInput = screen.getByPlaceholderText(/ej: 8/i);
    await user.clear(corteInput);
    await user.type(corteInput, "10");

    // Verificar advertencia de llave asimétrica
    expect(await screen.findByText(/llave asimétrica/i)).toBeInTheDocument();
    expect(screen.getByText(/6 equipo\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/cuartos de final/i)).toBeInTheDocument();
  });

  it("bloquea el envío si la multiplicación de grupos excede el máximo permitido (128)", async () => {
    const crearTorneoSpy = vi
      .spyOn(torneoService, "crearTorneo")
      .mockResolvedValue({ id: 1 } as unknown as Awaited<
        ReturnType<typeof torneoService.crearTorneo>
      >);
    const user = userEvent.setup();
    renderComponent();

    // Llenar nombre válido
    const nombreInput = screen.getByPlaceholderText(/ej: torneo relámpago f5/i);
    await user.type(nombreInput, "Torneo Masivo");

    // Seleccionar Fase de Grupos
    const formatoSelect = screen.getByDisplayValue(/liga simple/i);
    await user.selectOptions(formatoSelect, "grupos_eliminatorias");

    // 16 grupos
    const gruposSelect = screen.getByDisplayValue(/seleccionar\.\.\./i);
    await user.selectOptions(gruposSelect, "16");

    // 10 equipos por grupo = 160 (supera 128)
    const equiposPorGrupoInput = screen.getByPlaceholderText(/ej: 4/i);
    await user.clear(equiposPorGrupoInput);
    await user.type(equiposPorGrupoInput, "10");

    const submitBtn = screen.getByRole("button", { name: /crear torneo/i });
    await user.click(submitBtn);

    // Debe mostrar la advertencia de límite
    expect(
      await screen.findByText(
        /el torneo no puede superar el límite de 128 participantes/i,
      ),
    ).toBeInTheDocument();
    expect(crearTorneoSpy).not.toHaveBeenCalled();
  });

  it("envía lineaDeCorte e idaYVuelta cuando se configura Liguilla + Playoffs y resetea al cambiar de formato", async () => {
    const crearTorneoSpy = vi
      .spyOn(torneoService, "crearTorneo")
      .mockResolvedValue({ id: 99 } as unknown as Awaited<
        ReturnType<typeof torneoService.crearTorneo>
      >);
    const user = userEvent.setup();
    renderComponent();

    // En formato inicial (liga_simple) no debe existir el checkbox de ida y vuelta
    expect(
      screen.queryByLabelText(/jugar los cruces de eliminación/i),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/ej: torneo relámpago f5/i),
      "Copa Verano",
    );

    // Cambiar a Liguilla + Playoffs
    const formatoSelect = screen.getByDisplayValue(/liga simple/i);
    await user.selectOptions(formatoSelect, "liguilla_eliminacion");

    // Configurar 12 equipos y 4 clasificados
    const participantesInput = screen.getByPlaceholderText(/ej: 16/i);
    await user.clear(participantesInput);
    await user.type(participantesInput, "12");

    const corteInput = screen.getByPlaceholderText(/ej: 8/i);
    await user.clear(corteInput);
    await user.type(corteInput, "4");

    // Marcar ida y vuelta en playoffs
    const idaYVueltaCheckbox = screen.getByLabelText(
      /jugar los cruces de eliminación/i,
    );
    await user.click(idaYVueltaCheckbox);
    expect(idaYVueltaCheckbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: /crear torneo/i }));

    expect(crearTorneoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Copa Verano",
        formato: "liguilla_eliminacion",
        cantidadParticipantes: 12,
        cantidadGrupos: null,
        lineaDeCorte: 4,
        idaYVuelta: true,
      }),
    );
  });

  it("envía lineaDeCorte en null e idaYVuelta en false para formatos simples", async () => {
    const crearTorneoSpy = vi
      .spyOn(torneoService, "crearTorneo")
      .mockResolvedValue({ id: 100 } as unknown as Awaited<
        ReturnType<typeof torneoService.crearTorneo>
      >);
    const user = userEvent.setup();
    renderComponent();

    await user.type(
      screen.getByPlaceholderText(/ej: torneo relámpago f5/i),
      "Liga Apertura",
    );

    // Pasar primero por un formato mixto y tildar idaYVuelta para verificar limpieza
    const formatoSelect = screen.getByDisplayValue(/liga simple/i);
    await user.selectOptions(formatoSelect, "grupos_eliminatorias");
    await user.click(screen.getByLabelText(/jugar los cruces de eliminación/i));

    // Volver a liga_doble (donde idaYVuelta lo define el formato y no debe enviarse en true)
    await user.selectOptions(formatoSelect, "liga_doble");

    await user.click(screen.getByRole("button", { name: /crear torneo/i }));

    expect(crearTorneoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Liga Apertura",
        formato: "liga_doble",
        cantidadGrupos: null,
        lineaDeCorte: null,
        idaYVuelta: false,
      }),
    );
  });
});
