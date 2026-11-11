import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  obtenerTorneo,
  iniciarTorneo,
  cancelarTorneo,
} from "../service/torneoService";
import {
  obtenerEquipos,
  crearEquipo,
  eliminarEquipo,
  asignarGrupos,
  sortearGrupos,
} from "../../equipos/service/equipoService";
import type { Torneo } from "../types/torneo.types";
import type { Equipo } from "../../equipos/types/equipo.types";

export const useEditarTorneo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const torneoId = Number(id);

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estado local para los grupos asignados: { [equipoId]: número de grupo }
  const [asignacionesGrupos, setAsignacionesGrupos] = useState<
    Record<number, number | null>
  >({});

  // Campos locales para el alta de equipo
  const [nombreEquipo, setNombreEquipo] = useState<string>("");
  const [integrantesInput, setIntegrantesInput] = useState<string>("");

  const cargarDatos = useCallback(async () => {
    if (!torneoId) return;
    try {
      setLoading(true);
      const [torneoData, equiposData] = await Promise.all([
        obtenerTorneo(torneoId),
        obtenerEquipos(torneoId),
      ]);

      setTorneo(torneoData);
      setEquipos(equiposData);

      const gruposIniciales: Record<number, number | null> = {};
      equiposData.forEach((eq) => {
        gruposIniciales[eq.id] = eq.grupo;
      });
      setAsignacionesGrupos(gruposIniciales);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la información del torneo.");
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  // 2. Efecto inicial con su propia función interna (cumple al 100% con React Compiler)
  useEffect(() => {
    if (!torneoId) return;

    let activo = true;

    const inicializar = async () => {
      try {
        const [torneoData, equiposData] = await Promise.all([
          obtenerTorneo(torneoId),
          obtenerEquipos(torneoId),
        ]);

        if (!activo) return;

        setTorneo(torneoData);
        setEquipos(equiposData);

        const gruposIniciales: Record<number, number | null> = {};
        equiposData.forEach((eq) => {
          gruposIniciales[eq.id] = eq.grupo;
        });
        setAsignacionesGrupos(gruposIniciales);
        setError(null);
      } catch (err) {
        if (!activo) return;
        console.error(err);
        setError("No se pudo cargar la información del torneo.");
      } finally {
        if (activo) setLoading(false);
      }
    };

    void inicializar();

    return () => {
      activo = false;
    };
  }, [torneoId]);

  const handleAgregarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return;

    try {
      setError(null);
      const integrantesArray = integrantesInput
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      await crearEquipo(torneoId, {
        nombre: nombreEquipo.trim(),
        integrantes: integrantesArray.length > 0 ? integrantesArray : undefined,
      });

      setNombreEquipo("");
      setIntegrantesInput("");
      await cargarDatos();
    } catch (err: unknown) {
      const mensaje =
        (err as { response?: { data?: { error?: { mensaje?: string } } } })
          ?.response?.data?.error?.mensaje || "Error al inscribir el equipo.";
      setError(mensaje);
    }
  };

  const handleEliminarEquipo = async (equipoId: number) => {
    if (!confirm("¿Estás seguro de eliminar este equipo?")) return;
    try {
      await eliminarEquipo(torneoId, equipoId);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar el equipo.");
    }
  };

  // Manejar cambio de grupo en el selector local
  const handleCambioGrupoLocal = (equipoId: number, grupo: number | null) => {
    setAsignacionesGrupos((prev) => ({
      ...prev,
      [equipoId]: grupo,
    }));
  };

  const cupoAlcanzado = torneo
    ? equipos.length >= torneo.cantidadParticipantes
    : false;
  const esGrupos = torneo?.formato === "grupos_eliminatorias";
  const cantidadGrupos = torneo?.cantidadGrupos ?? 0;

  // Contar cuántos equipos hay por grupo actualmente en el estado local
  const conteoPorGrupo = useMemo(() => {
    const conteo: Record<number, number> = {};
    for (let i = 1; i <= cantidadGrupos; i++) {
      conteo[i] = 0;
    }
    Object.values(asignacionesGrupos).forEach((g) => {
      if (g !== null && conteo[g] !== undefined) {
        conteo[g]++;
      }
    });
    return conteo;
  }, [asignacionesGrupos, cantidadGrupos]);

  // Validación estricta de la distribución de grupos
  const validarDistribucionGrupos = (): boolean => {
    // 1. Verificar si hay equipos sin grupo asignado
    const equiposSinAsignar = equipos.some(
      (eq) =>
        asignacionesGrupos[eq.id] === null ||
        asignacionesGrupos[eq.id] === undefined,
    );
    if (equiposSinAsignar) {
      setError(
        "Hay equipos sin grupo asignado. Todos deben pertenecer a un grupo.",
      );
      return false;
    }

    // 2. Obtener las cantidades por grupo
    const cantidades = Object.values(conteoPorGrupo);
    const maxCant = Math.max(...cantidades);
    const minCant = Math.min(...cantidades);

    // La diferencia entre el grupo más poblado y el menos poblado no puede ser mayor a 1
    if (maxCant - minCant > 1) {
      setError(
        `Los grupos están desbalanceados. Para mantener la equidad del torneo, todos los grupos deben tener la misma cantidad de equipos (o una diferencia máxima de 1). Usá "Sortear Grupos al Azar" si preferís que el sistema lo calcule automáticamente.`,
      );
      return false;
    }

    setError(null);
    return true;
  };

  // Guardar asignaciones manuales en el backend
  const handleGuardarGrupos = async () => {
    if (esGrupos && !validarDistribucionGrupos()) return;
    try {
      setError(null);
      const asignacionesPayload = Object.entries(asignacionesGrupos).map(
        ([equipoId, grupo]) => ({
          equipoId: Number(equipoId),
          grupo: grupo !== undefined ? grupo : null,
        }),
      );

      await asignarGrupos(torneoId, asignacionesPayload);
      await cargarDatos();
      alert("¡Grupos guardados correctamente!");
    } catch (err: unknown) {
      const mensaje =
        (err as { response?: { data?: { error?: { mensaje?: string } } } })
          ?.response?.data?.error?.mensaje || "Error al guardar los grupos.";
      setError(mensaje);
    }
  };

  // Sortear grupos al azar de forma automática
  const handleSortearGrupos = async () => {
    try {
      setError(null);
      await sortearGrupos(torneoId);
      await cargarDatos();
      alert("¡Sorteo de grupos realizado con éxito!");
    } catch (err: unknown) {
      const mensaje =
        (err as { response?: { data?: { error?: { mensaje?: string } } } })
          ?.response?.data?.error?.mensaje || "Error al sortear los grupos.";
      setError(mensaje);
    }
  };

  const handleIniciarTorneo = async () => {
    // Si es un torneo de grupos, validamos obligatoriamente antes de iniciar
    if (esGrupos && !validarDistribucionGrupos()) {
      return;
    }

    if (
      !confirm(
        "Una vez iniciado el torneo, la configuración quedará bloqueada y no se podrán agregar más equipos. ¿Deseas continuar?",
      )
    ) {
      return;
    }
    try {
      setError(null);
      await iniciarTorneo(torneoId);
      navigate("/torneos");
    } catch (err: unknown) {
      const mensaje =
        (err as { response?: { data?: { error?: { mensaje?: string } } } })
          ?.response?.data?.error?.mensaje || "Error al iniciar el torneo.";
      setError(mensaje);
    }
  };

  const handleCancelarTorneo = async () => {
    if (!confirm("¿Deseas cancelar este torneo?")) return;
    try {
      await cancelarTorneo(torneoId);
      navigate("/torneos");
    } catch (err) {
      console.error(err);
      setError("No se pudo cancelar el torneo.");
    }
  };

  return {
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
    navigate,
  };
};
