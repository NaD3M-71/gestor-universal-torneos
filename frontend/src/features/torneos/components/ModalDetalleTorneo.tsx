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
  const esBorrador = torneo.estado === "borrador";
  const esEnCurso = torneo.estado === "en_curso";
  const esFinalizado = torneo.estado === "finalizado";
  const esCancelado = torneo.estado === "cancelado";

  // Configuración de colores y títulos según el estado del torneo
  const getHeaderConfig = () => {
    if (esBorrador)
      return { bg: "bg-amber-600", title: "📋 Detalle del Torneo (Borrador)" };
    if (esEnCurso) return { bg: "bg-green-600", title: "⚡ Torneo en Curso" };
    if (esFinalizado)
      return { bg: "bg-blue-600", title: "🏆 Torneo Finalizado" };
    return { bg: "bg-red-600", title: "🚫 Torneo Cancelado" };
  };

  const header = getHeaderConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all my-8">
        {/* Cabecera del Modal */}
        <div
          className={`px-6 py-4 flex justify-between items-center text-white ${header.bg}`}
        >
          <h3 className="text-lg font-bold">{header.title}</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl font-bold px-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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

          {/* Mensaje informativo si está en Borrador */}
          {esBorrador && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-900 text-xs">
              ⚠️ <strong>Borrador activo:</strong> Las fases se encuentran
              inicializadas en estado pendiente. Puedes hacer clic en{" "}
              <strong>"Gestionar"</strong> desde la tabla principal para
              inscribir a los equipos y configurar los grupos antes de dar
              inicio oficial al torneo.
            </div>
          )}

          {/* Sección específica si está Finalizado */}
          {esFinalizado && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h5 className="font-bold text-blue-900 mb-1 text-sm">
                Podium / Campeón
              </h5>
              <p className="text-blue-800 text-sm">
                🥇 Campeón:{" "}
                <span className="font-bold">
                  {torneo.campeon?.nombre ?? "Definido"}
                </span>
              </p>
            </div>
          )}

          {/* Sección específica si está Cancelado */}
          {esCancelado && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h5 className="font-bold text-red-900 mb-1 text-sm">
                Estado de Cancelación
              </h5>
              <p className="text-red-700 text-xs">
                Este torneo fue dado de baja durante su transcurso o antes de
                completarse.
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
