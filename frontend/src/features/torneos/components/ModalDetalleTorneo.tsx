// src/features/torneos/components/ModalDetalleTorneo.tsx
import React from "react";
import type { Torneo } from "../types/torneo.types";

interface ModalDetalleTorneoProps {
  torneo: Torneo;
  onClose: () => void;
}

export const ModalDetalleTorneo: React.FC<ModalDetalleTorneoProps> = ({
  torneo,
  onClose,
}) => {
  const esFinalizado = torneo.estado === "finalizado";
  const esCancelado = torneo.estado === "cancelado";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all">
        {/* Cabecera del Modal */}
        <div
          className={`px-6 py-4 flex justify-between items-center text-white ${esFinalizado ? "bg-blue-600" : "bg-red-600"}`}
        >
          <h3 className="text-lg font-bold">
            {esFinalizado ? "🏆 Torneo Finalizado" : "🚫 Torneo Cancelado"}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl font-bold px-2 rounded-lg transition-colors"
          >
            X
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-2xl font-bold text-gray-900">
              {torneo.nombre}
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              {torneo.descripcion || "Sin descripción proporcionada."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm">
            <div>
              <span className="block text-gray-500">Formato:</span>
              <span className="font-semibold capitalize text-gray-800">
                {torneo.formato.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Puntuación:</span>
              <span className="font-semibold capitalize text-gray-800">
                {torneo.sistemaPuntuacion.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Participantes:</span>
              <span className="font-semibold text-gray-800">
                {torneo.cantidadParticipantes} equipos
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Fecha de Inicio:</span>
              <span className="font-semibold text-gray-800">
                {torneo.fechaInicio
                  ? new Date(torneo.fechaInicio).toLocaleDateString()
                  : "No definida"}
              </span>
            </div>
          </div>

          {/* Sección específica si está Finalizado */}
          {esFinalizado && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h5 className="font-bold text-blue-900 mb-1">Podium / Campeón</h5>
              <p className="text-blue-800 text-sm">
                🥇 Campeón:{" "}
                <span className="font-bold">
                  {torneo.campeon?.nombre ?? "Definido"}
                </span>
              </p>
              {/* Espacio para resumen del fixture final o enlace a resultados */}
              <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
                El fixture y los enfrentamientos de la fase final se encuentran
                archivados en el historial.
              </div>
            </div>
          )}

          {/* Sección específica si está Cancelado */}
          {esCancelado && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h5 className="font-bold text-red-900 mb-1">
                Estado de Cancelación
              </h5>
              <p className="text-red-700 text-sm">
                Este torneo fue dado de baja durante su transcurso o antes de
                completarse, por lo que su actividad se encuentra suspendida de
                manera permanente.
              </p>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="bg-gray-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
