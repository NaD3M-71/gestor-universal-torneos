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
    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
      {/* Contenedor fluido sin forzar desbordes innecesarios */}
      <table className="w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </th>
            <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Formato
            </th>
            <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Puntuación
            </th>
            <th className="w-16 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Equipos
            </th>
            <th className="w-16 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Grupos
            </th>
            <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Inicio
            </th>
            <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="w-24 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {torneos.map((torneo) => (
            <tr key={torneo.id} className="hover:bg-gray-50 transition-colors">
              <td
                className="px-4 py-3 font-medium text-gray-900 truncate"
                title={torneo.nombre}
              >
                {torneo.nombre}
              </td>
              <td className="px-3 py-3 text-xs text-gray-600 capitalize truncate">
                {torneo.formato.replace("_", " ")}
              </td>
              <td className="px-3 py-3 text-xs text-gray-600 capitalize truncate">
                {torneo.sistemaPuntuacion.replace("_", " ")}
              </td>
              <td className="px-2 py-3 text-xs text-center text-gray-600">
                {torneo.cantidadParticipantes}
              </td>
              <td className="px-2 py-3 text-xs text-center text-gray-600">
                {torneo.cantidadGrupos ?? "-"}
              </td>
              <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                {torneo.fechaInicio
                  ? new Date(torneo.fechaInicio).toLocaleDateString()
                  : "Sin definir"}
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full capitalize
                  ${torneo.estado === "en_curso" ? "bg-green-100 text-green-800" : ""}
                  ${torneo.estado === "borrador" ? "bg-yellow-100 text-yellow-800" : ""}
                  ${torneo.estado === "finalizado" ? "bg-blue-100 text-blue-800" : ""}
                  ${torneo.estado === "cancelado" ? "bg-red-100 text-red-800" : ""}
                `}
                >
                  {torneo.estado.replace("_", " ")}
                </span>
              </td>
              <td className="px-3 py-3 text-right text-xs font-medium">
                <button
                  onClick={() => onAccion(torneo)}
                  className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
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
