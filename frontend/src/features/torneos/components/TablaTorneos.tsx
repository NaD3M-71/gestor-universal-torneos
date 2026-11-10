// src/features/torneos/components/TablaTorneos.tsx
import React from "react";
import type { Torneo } from "../types/torneo.types";

interface TablaTorneosProps {
  torneos: Torneo[];
  onAccion: (torneo: Torneo) => void;
}

export const TablaTorneos: React.FC<TablaTorneosProps> = ({
  torneos,
  onAccion,
}) => {
  if (torneos.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow border border-gray-100">
        <p className="text-gray-500">No hay torneos en esta sección.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-100">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Formato
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Puntuación
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Participantes
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Grupos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Inicio
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Campeón
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {torneos.map((torneo) => (
            <tr key={torneo.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                {torneo.nombre}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                {torneo.formato.replace("_", " ")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                {torneo.sistemaPuntuacion.replace("_", " ")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                {torneo.cantidadParticipantes}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                {torneo.cantidadGrupos ?? "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {torneo.fechaInicio
                  ? new Date(torneo.fechaInicio).toLocaleDateString()
                  : "Sin definir"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                  ${torneo.estado === "en_curso" ? "bg-green-100 text-green-800" : ""}
                  ${torneo.estado === "borrador" ? "bg-yellow-100 text-yellow-800" : ""}
                  ${torneo.estado === "finalizado" ? "bg-blue-100 text-blue-800" : ""}
                  ${torneo.estado === "cancelado" ? "bg-red-100 text-red-800" : ""}
                `}
                >
                  {torneo.estado.replace("_", " ")}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {torneo.campeon?.nombre ??
                  (torneo.estado === "finalizado" ? "Definido" : "-")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onAccion(torneo)}
                  className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                >
                  {torneo.estado === "borrador" ? "Editar" : "Ver"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
