import React from "react";
import { useCrearTorneo } from "../hooks/useCrearTorneo";
import { useNavigate } from "react-router-dom";
import { DESCRIPCIONES_FORMATO } from "../types/torneo.types";
import { esPotenciaDeDos, obtenerNombreRonda } from "../utils/torneoCalculos";

export const CrearTorneoView: React.FC = () => {
  const {
    register,
    onSubmit,
    errors,
    isSubmitting,
    esGruposEliminatorias,
    esLiguilla,
    formato,
    cantidadGrupos,
    participantesPorGrupo,
    lineaCorte,
    idaYVuelta,
    resumen,
    errorGeneral,
  } = useCrearTorneo();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <button
        onClick={() => navigate("/torneos")}
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 flex items-center gap-1 transition-colors"
      >
        ← Volver a Mis Torneos
      </button>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Crear Nuevo Torneo
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Configura los parámetros iniciales de tu competencia.
          </p>
        </div>

        {errorGeneral && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {errorGeneral}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {/* Nombre y Descripción */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Torneo *
              </label>
              <input
                type="text"
                {...register("nombre")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Torneo Relámpago F5"
              />
              {errors.nombre && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.nombre.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (Opcional)
              </label>
              <textarea
                {...register("descripcion")}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Detalles, reglas o premios..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Formato y Sistema de Puntuación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formato de Competencia *
              </label>
              <select
                {...register("formato")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="liga_simple">
                  Liga simple (Todos contra todos)
                </option>
                <option value="liga_doble">Liga doble (Ida y vuelta)</option>
                <option value="eliminacion_simple">Eliminación simple</option>
                <option value="eliminacion_doble">Eliminación doble</option>
                <option value="liguilla_eliminacion">
                  Liguilla + Playoffs
                </option>
                <option value="grupos_eliminatorias">
                  Fase de Grupos + Eliminatorias
                </option>
              </select>
              <p className="text-xs text-gray-500 mt-1.5 italic">
                {DESCRIPCIONES_FORMATO[formato]}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {esGruposEliminatorias
                  ? "Puntuación en Grupos *"
                  : esLiguilla
                    ? "Puntuación en Fase Regular *"
                    : "Sistema de Puntuación *"}
              </label>
              {formato === "eliminacion_simple" ||
              formato === "eliminacion_doble" ? (
                <div className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm">
                  Ganada / Perdida (Llave directa)
                  <input
                    type="hidden"
                    {...register("sistemaPuntuacion")}
                    value="ganada_perdida"
                  />
                </div>
              ) : (
                <>
                  <select
                    {...register("sistemaPuntuacion")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="futbol_clasico">
                      Fútbol Clásico (3v, 1e, 0p)
                    </option>
                    <option value="sistema_alternativo">
                      Alternativo (2v, 1e, 0p)
                    </option>
                    <option value="ganada_perdida">
                      Ganada / Perdida (1v, 0e, 0p)
                    </option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1 italic">
                    Define cómo suman puntos los equipos en la tabla de
                    posiciones.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ÁREA DINÁMICA DE PARTICIPANTES Y GRUPOS */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            {esGruposEliminatorias ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grupos (Potencia de 2) *
                    </label>
                    <select
                      {...register("cantidadGrupos", { valueAsNumber: true })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value={2}>2 Grupos</option>
                      <option value={4}>4 Grupos</option>
                      <option value={8}>8 Grupos</option>
                      <option value={16}>16 Grupos</option>
                      <option value={32}>32 Grupos</option>
                    </select>
                    {errors.cantidadGrupos && (
                      <span className="text-xs text-red-500 mt-1 block">
                        {errors.cantidadGrupos.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Equipos por grupo *
                    </label>
                    <input
                      type="number"
                      min={2}
                      {...register("participantesPorGrupo", {
                        valueAsNumber: true,
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 4"
                    />
                    {errors.participantesPorGrupo && (
                      <span className="text-xs text-red-500 mt-1 block">
                        {errors.participantesPorGrupo.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clasifican por grupo *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, (participantesPorGrupo || 2) - 1)}
                      onInput={(e) => {
                        const input = e.currentTarget;
                        const maxVal = Math.max(
                          1,
                          (participantesPorGrupo || 2) - 1,
                        );
                        if (Number(input.value) > maxVal) {
                          input.value = String(maxVal);
                        }
                      }}
                      {...register("lineaCorte", { valueAsNumber: true })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 2"
                    />
                    {errors.lineaCorte && (
                      <span className="text-xs text-red-500 mt-1 block">
                        {errors.lineaCorte.message}
                      </span>
                    )}
                  </div>
                  {(errors.cantidadParticipantes ||
                    resumen.totalParticipantes > 128) && (
                    <span className="text-xs text-red-500 mt-1 block col-span-3">
                      ⚠️ El torneo no puede superar el límite de 128
                      participantes en total.
                    </span>
                  )}
                </div>

                <input
                  type="hidden"
                  {...register("cantidadParticipantes", {
                    valueAsNumber: true,
                  })}
                />
              </div>
            ) : esLiguilla ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipos en Fase Regular *
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={128}
                    {...register("cantidadParticipantes", {
                      valueAsNumber: true,
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 16"
                  />
                  {errors.cantidadParticipantes && (
                    <span className="text-xs text-red-500 mt-1 block">
                      {errors.cantidadParticipantes.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clasifican a Playoffs *
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={Math.max(2, (resumen.totalParticipantes || 2) - 1)}
                    onInput={(e) => {
                      const input = e.currentTarget;
                      const maxVal = Math.max(
                        2,
                        (resumen.totalParticipantes || 2) - 1,
                      );
                      if (Number(input.value) > maxVal) {
                        input.value = String(maxVal);
                      }
                    }}
                    {...register("lineaCorte", { valueAsNumber: true })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 8"
                  />
                  {errors.lineaCorte && (
                    <span className="text-xs text-red-500 mt-1 block">
                      {errors.lineaCorte.message}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Máxima de Participantes (2 - 128) *
                </label>
                <input
                  type="number"
                  min={2}
                  max={128}
                  {...register("cantidadParticipantes", {
                    valueAsNumber: true,
                  })}
                  className="w-full sm:w-1/2 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 16"
                />
                {errors.cantidadParticipantes && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.cantidadParticipantes.message}
                  </span>
                )}
              </div>
            )}

            {/* Checkbox de Ida y Vuelta para la fase eliminatoria */}
            {(esGruposEliminatorias || esLiguilla) && (
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2.5">
                <input
                  id="idaYVuelta"
                  type="checkbox"
                  {...register("idaYVuelta")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="idaYVuelta"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  Jugar los cruces de eliminación (Playoffs) a{" "}
                  <strong>ida y vuelta</strong>
                </label>
              </div>
            )}

            {/* PANEL DE RESUMEN Y ADVERTENCIAS */}
            {/* PANEL DE RESUMEN NARRATIVO */}
            <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-sm text-blue-950 mt-4 space-y-2">
              <h4 className="font-bold flex items-center gap-2 text-blue-900">
                📋 Dinámica del Torneo
              </h4>

              {esLiguilla ? (
                <div className="space-y-1.5 text-blue-900 leading-relaxed">
                  <p>
                    <strong>1. Fase Regular:</strong> Competirán{" "}
                    <strong>{resumen.totalParticipantes} equipos</strong> en
                    formato todos contra todos sumando puntos en una tabla
                    única.
                  </p>
                  <p>
                    <strong>2. Playoffs:</strong> Al finalizar, los mejores{" "}
                    <strong>{resumen.totalClasificados} equipos</strong> avanzan
                    al cuadro de eliminación directa
                    {esPotenciaDeDos(resumen.totalClasificados) &&
                      ` arrancando directamente desde ${obtenerNombreRonda(resumen.totalClasificados)}`}
                    {idaYVuelta
                      ? " (cruces finales a ida y vuelta)"
                      : " (partido único, sin vuelta)"}
                    .
                  </p>
                  {resumen.infoLlave && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs mt-2">
                      ⚠️ <strong>Llave asimétrica:</strong> Los mejores{" "}
                      <strong>{resumen.infoLlave.byes} equipo(s)</strong> de la
                      tabla obtendrán pase libre (bye) directo a{" "}
                      <strong>{resumen.infoLlave.nombreRondaObjetivo}</strong>,
                      mientras que los {resumen.infoLlave.jueganPrimeraRonda}{" "}
                      restantes disputarán una ronda preliminar clasificatoria.
                    </div>
                  )}
                </div>
              ) : esGruposEliminatorias ? (
                <div className="space-y-1.5 text-blue-900 leading-relaxed">
                  <p>
                    <strong>1. Fase de Grupos:</strong>{" "}
                    {resumen.totalParticipantes} equipos repartidos en{" "}
                    {cantidadGrupos} grupos de {participantesPorGrupo} equipos
                    cada uno.
                  </p>
                  <p>
                    <strong>2. Cuadro Final:</strong> Clasifican los mejores{" "}
                    {lineaCorte} de cada grupo (total de{" "}
                    <strong>{resumen.totalClasificados} clasificados</strong>)
                    {esPotenciaDeDos(resumen.totalClasificados) &&
                      ` comenzando en ${obtenerNombreRonda(resumen.totalClasificados)}`}
                    {idaYVuelta
                      ? " (cruces finales a ida y vuelta)"
                      : " (partido único, sin vuelta)"}
                    .
                  </p>
                  {resumen.tieneByesGrupos && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
                      ⚠️ <strong>Fecha libre:</strong> Al ser zonas con
                      participantes impares, 1 equipo por grupo tendrá descanso
                      en cada jornada.
                    </div>
                  )}
                  {resumen.infoLlave && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs mt-1">
                      ⚠️ <strong>Playoffs con Byes:</strong> Al clasificar{" "}
                      {resumen.totalClasificados} equipos,{" "}
                      <strong>{resumen.infoLlave.byes} equipo(s)</strong>{" "}
                      pasarán directo a {resumen.infoLlave.nombreRondaObjetivo},
                      y los {resumen.infoLlave.jueganPrimeraRonda} restantes
                      jugarán la ronda previa.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 text-blue-900 leading-relaxed">
                  <p>
                    El torneo se jugará con{" "}
                    <strong>{resumen.totalParticipantes} participantes</strong>{" "}
                    bajo el formato seleccionado.
                  </p>
                  {resumen.infoLlave && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs mt-1">
                      ⚠️ <strong>Cuadro con Byes:</strong> Como{" "}
                      {resumen.totalParticipantes} no forma una llave perfecta
                      de eliminación,{" "}
                      <strong>{resumen.infoLlave.byes} equipo(s)</strong>{" "}
                      avanzarán directamente a{" "}
                      {resumen.infoLlave.nombreRondaObjetivo} por pase libre.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fecha de Inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio (Opcional)
            </label>
            <input
              type="date"
              {...register("fechaInicio")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate("/torneos")}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow text-sm disabled:opacity-50"
            >
              {isSubmitting ? "Creando..." : "Crear Torneo (Borrador)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
