// src/features/torneos/views/MisTorneosView.tsx
import React from "react";
import { useMisTorneos } from "../hooks/useMisTorneos";
import { TablaTorneos } from "../components/TablaTorneos";
import { ModalDetalleTorneo } from "../components/ModalDetalleTorneo";
import type { EstadoTorneo } from "../types/torneo.types";

export const MisTorneosView: React.FC = () => {
  const {
    torneosFiltrados,
    pestanaActiva,
    setPestanaActiva,
    modalAbierto,
    setModalAbierto,
    torneoSeleccionado,
    handleAccionTorneo,
    handleCrearTorneo,
  } = useMisTorneos();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Cabecera con Título y Botón de Crear */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Torneos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona, crea y supervisa el estado de tus competencias.
          </p>
        </div>
        <button
          onClick={handleCrearTorneo}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow transition-colors flex items-center gap-2"
        >
          <span>+ Nuevo Torneo</span>
        </button>
      </div>

      {/* Pestañas de Estado */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        {(
          [
            { key: "en_curso", label: "Activos" },
            { key: "borrador", label: "Borradores" },
            { key: "finalizado", label: "Finalizados" },
            { key: "cancelado", label: "Cancelados" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            className={`py-3 px-5 font-medium text-sm transition-colors border-b-2 -mb-px ${
              pestanaActiva === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setPestanaActiva(tab.key as EstadoTorneo)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabla de Torneos */}
      <TablaTorneos torneos={torneosFiltrados} onAccion={handleAccionTorneo} />

      {/* Modal Informativo para Finalizados / Cancelados */}
      {modalAbierto && torneoSeleccionado && (
        <ModalDetalleTorneo
          torneo={torneoSeleccionado}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
};
