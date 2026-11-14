import React from "react";
import { useEditarTorneo } from "../hooks/useEditarTorneo";
import { Toast } from "@components/ui/Toast";
import { ConfirmModal } from "@components/ui/ConfirmModal";

export const EditarTorneoView: React.FC = () => {
  const {
    torneo,
    equipos,
    loading,
    error,
    nombreEquipo,
    setNombreEquipo,
    integrantesInput,
    setIntegrantesInput,
    cupoAlcanzado,
    esGrupos,
    cantidadGrupos,
    asignacionesGrupos,
    handleCambioGrupoLocal,
    handleGuardarGrupos,
    handleSortearGrupos,
    handleAgregarEquipo,
    handleEliminarEquipo,
    handleIniciarTorneo,
    handleCancelarTorneo,
    toastMessage,
    cerrarToast,
    modalConfig,
    cerrarModal,
    isProcessingModal,
    navigate,
  } = useEditarTorneo();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Cargando configuración del torneo...
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="container mx-auto p-6 max-w-4xl text-center">
        <p className="text-red-500">Torneo no encontrado o inaccesible.</p>
        <button
          onClick={() => navigate("/torneos")}
          className="mt-4 text-blue-600 underline"
        >
          Volver a Mis Torneos
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate("/torneos")}
            className="text-sm text-gray-500 hover:text-gray-800 mb-2 flex items-center gap-1"
          >
            ← Volver a Mis Torneos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{torneo.nombre}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Formato:{" "}
            <span className="font-semibold capitalize">
              {torneo.formato.replace("_", " ")}
            </span>{" "}
            | Participantes inscriptos:{" "}
            <span className="font-bold text-blue-600">
              {equipos.length} / {torneo.cantidadParticipantes}
            </span>
            {esGrupos && ` | Grupos: ${cantidadGrupos}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCancelarTorneo}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition-colors"
          >
            Cancelar Torneo
          </button>
          <button
            onClick={handleIniciarTorneo}
            disabled={equipos.length < 2}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow transition-colors disabled:opacity-50"
            title={
              equipos.length < 2
                ? "Se necesitan al menos 2 equipos para iniciar"
                : "Iniciar competencia"
            }
          >
            🚀 Iniciar Torneo Oficial
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* SECCIÓN ESPECIAL DE GRUPOS (Si el torneo usa grupos) */}
      {/* SECCIÓN DE GESTIÓN DE GRUPOS */}
      {esGrupos && equipos.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-5 rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
            <div>
              <h2 className="text-md font-bold text-blue-900">
                Distribución por Grupos
              </h2>
              <p className="text-xs text-blue-700 mt-0.5">
                Asegurate de repartir equitativamente los equipos. Ningún grupo
                debe quedar vacío.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSortearGrupos}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow transition-colors"
                title="Reparte automáticamente los equipos de forma equitativa"
              >
                🎲 Sortear Grupos al Azar
              </button>
              <button
                onClick={handleGuardarGrupos}
                className="px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 text-xs font-medium rounded-lg transition-colors"
              >
                💾 Guardar Asignaciones
              </button>
            </div>
          </div>

          {/* Resumen en tiempo real de cuántos equipos hay por grupo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-blue-200/60">
            {Array.from({ length: cantidadGrupos }, (_, i) => i + 1).map(
              (gNum) => {
                const cantEquiposEnGrupo = equipos.filter(
                  (eq) => asignacionesGrupos[eq.id] === gNum,
                ).length;
                const estaVacio = cantEquiposEnGrupo === 0;

                return (
                  <div
                    key={gNum}
                    className={`p-2.5 rounded-lg border text-xs ${
                      estaVacio
                        ? "bg-amber-50 border-amber-300 text-amber-800"
                        : "bg-white border-blue-200 text-blue-900"
                    }`}
                  >
                    <span className="font-bold">Grupo {gNum}:</span>{" "}
                    {cantEquiposEnGrupo} equipos
                    {estaVacio && (
                      <span className="block text-[10px] text-amber-600 mt-0.5">
                        ⚠️ Vacío
                      </span>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario de Inscripción de Equipos */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 md:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Inscribir Equipo
          </h2>

          <form onSubmit={handleAgregarEquipo} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre del Equipo *
              </label>
              <input
                type="text"
                value={nombreEquipo}
                onChange={(e) => setNombreEquipo(e.target.value)}
                disabled={cupoAlcanzado}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                placeholder="Ej: Los Picapiedras"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Integrantes (separados por coma)
              </label>
              <textarea
                value={integrantesInput}
                onChange={(e) => setIntegrantesInput(e.target.value)}
                disabled={cupoAlcanzado}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                placeholder="Juan Pérez, Carlos Gómez..."
              />
            </div>

            <button
              type="submit"
              disabled={cupoAlcanzado || !nombreEquipo.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition-colors disabled:opacity-50"
            >
              {cupoAlcanzado ? "Cupo Completo" : "Agregar Equipo"}
            </button>
          </form>
        </div>

        {/* Listado de Equipos Inscriptos con Selector de Grupo */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 md:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Equipos Inscriptos ({equipos.length})
          </h2>

          {equipos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-400 text-sm">
                No hay equipos inscriptos todavía.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {equipos.map((eq, index) => (
                <div
                  key={eq.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-200/60 gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">
                        #{index + 1}
                      </span>
                      <h3 className="font-semibold text-gray-900">
                        {eq.nombre}
                      </h3>
                    </div>
                    {eq.integrantes && eq.integrantes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Integrantes:{" "}
                        {eq.integrantes.map((i) => i.nombre).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Selector de Grupo si el torneo usa grupos */}
                  {esGrupos && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">
                        Grupo:
                      </span>
                      <select
                        value={asignacionesGrupos[eq.id] ?? ""}
                        onChange={(e) =>
                          handleCambioGrupoLocal(
                            eq.id,
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="px-2.5 py-1 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Sin grupo</option>
                        {Array.from(
                          { length: cantidadGrupos },
                          (_, i) => i + 1,
                        ).map((gNum) => (
                          <option key={gNum} value={gNum}>
                            Grupo {gNum}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => handleEliminarEquipo(eq.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        isLoading={isProcessingModal}
        onConfirm={modalConfig.onConfirm}
        onCancel={cerrarModal}
      />

      <Toast message={toastMessage} type="success" onClose={cerrarToast} />
    </div>
  );
};
