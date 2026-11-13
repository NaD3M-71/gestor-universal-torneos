import { useEffect, useMemo, useState } from "react";
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

/**
 * Función auxiliar para extraer mensajes de error detallados del backend de Giuliano.
 * Si el servidor envía un array de `detalles` por campo, los combina; de lo contrario, usa el mensaje general.
 */
const formatearErrorBackend = (
  err: unknown,
  mensajePorDefecto: string,
): string => {
  const errorObj = (
    err as {
      response?: {
        data?: {
          error?: {
            mensaje?: string;
            detalles?: Array<{ campo: string; mensaje: string }>;
          };
        };
      };
    }
  )?.response?.data?.error;

  if (errorObj?.detalles && errorObj.detalles.length > 0) {
    return errorObj.detalles.map((d) => d.mensaje).join(" ");
  }

  return errorObj?.mensaje || mensajePorDefecto;
};

export const useEditarTorneo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const torneoId = Number(id);

  // Estados principales de la vista
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estado local para los grupos asignados: { [equipoId]: número de grupo }
  const [asignacionesGrupos, setAsignacionesGrupos] = useState<
    Record<number, number | null>
  >({});

  // Campos locales para el formulario de alta rápida de equipo
  const [nombreEquipo, setNombreEquipo] = useState<string>("");
  const [integrantesInput, setIntegrantesInput] = useState<string>("");

  // Carga inicial de datos al montar la vista (compatible al 100% con React Compiler)
  useEffect(() => {
    if (!torneoId) return;

    let activo = true;

    const inicializar = async () => {
      try {
        setLoading(true);
        const [torneoData, equiposData] = await Promise.all([
          obtenerTorneo(torneoId),
          obtenerEquipos(torneoId),
        ]);

        if (!activo) return;

        setTorneo(torneoData);
        setEquipos(equiposData);

        // Mapear los grupos iniciales de los equipos al estado local
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

  // Inscribir un nuevo equipo (actualización optimista local sin pantalla en blanco)
  const handleAgregarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return;

    try {
      setError(null);
      const integrantesArray = integrantesInput
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const nuevoEquipo = await crearEquipo(torneoId, {
        nombre: nombreEquipo.trim(),
        integrantes: integrantesArray.length > 0 ? integrantesArray : undefined,
      });

      // Agregamos el equipo al estado local de forma fluida
      setEquipos((prev) => [...prev, nuevoEquipo]);

      if (esGrupos) {
        setAsignacionesGrupos((prev) => ({
          ...prev,
          [nuevoEquipo.id]: null,
        }));
      }

      setNombreEquipo("");
      setIntegrantesInput("");
    } catch (err: unknown) {
      const mensaje = formatearErrorBackend(
        err,
        "Error al inscribir el equipo.",
      );
      setError(mensaje);
    }
  };

  // Eliminar un equipo existente (actualización optimista local)
  const handleEliminarEquipo = async (equipoId: number) => {
    if (!confirm("¿Estás seguro de eliminar este equipo?")) return;
    try {
      setError(null);
      await eliminarEquipo(torneoId, equipoId);

      setEquipos((prev) => prev.filter((eq) => eq.id !== equipoId));

      setAsignacionesGrupos((prev) => {
        const copy = { ...prev };
        delete copy[equipoId];
        return copy;
      });
    } catch (err: unknown) {
      const mensaje = formatearErrorBackend(
        err,
        "No se pudo eliminar el equipo.",
      );
      setError(mensaje);
    }
  };

  // Manejar el cambio de grupo en el selector local de cada equipo
  const handleCambioGrupoLocal = (equipoId: number, grupo: number | null) => {
    setAsignacionesGrupos((prev) => ({
      ...prev,
      [equipoId]: grupo,
    }));
  };

  // Propiedades calculadas útiles
  const cupoAlcanzado = torneo
    ? equipos.length >= torneo.cantidadParticipantes
    : false;
  const esGrupos = torneo?.formato === "grupos_eliminatorias";
  const cantidadGrupos = torneo?.cantidadGrupos ?? 0;

  // Conteo de equipos por grupo para validar balance
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

  // Validación estricta previa a guardar o iniciar en torneos con grupos
  const validarDistribucionGrupos = (): boolean => {
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

    const cantidades = Object.values(conteoPorGrupo);
    const maxCant = Math.max(...cantidades);
    const minCant = Math.min(...cantidades);

    if (maxCant - minCant > 1) {
      setError(
        `Los grupos están desbalanceados. Para mantener la equidad del torneo, todos los grupos deben tener la misma cantidad de equipos (o una diferencia máxima de 1). Usá "Sortear Grupos al Azar" si preferís que el sistema lo calcule automáticamente.`,
      );
      return false;
    }

    setError(null);
    return true;
  };

  // Guardar asignaciones manuales de grupos en el backend
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

      const equiposActualizados = await asignarGrupos(
        torneoId,
        asignacionesPayload,
      );

      if (equiposActualizados && Array.isArray(equiposActualizados)) {
        setEquipos(equiposActualizados);
      }

      alert("¡Grupos guardados correctamente!");
    } catch (err: unknown) {
      const mensaje = formatearErrorBackend(
        err,
        "Error al guardar los grupos.",
      );
      setError(mensaje);
    }
  };

  // Sortear grupos al azar automáticamente
  const handleSortearGrupos = async () => {
    try {
      setError(null);
      const equiposActualizados = await sortearGrupos(torneoId);
      setEquipos(equiposActualizados);

      const gruposNuevos: Record<number, number | null> = {};
      equiposActualizados.forEach((eq: Equipo) => {
        gruposNuevos[eq.id] = eq.grupo;
      });
      setAsignacionesGrupos(gruposNuevos);

      alert("¡Sorteo de grupos realizado con éxito!");
    } catch (err: unknown) {
      const mensaje = formatearErrorBackend(
        err,
        "Error al sortear los grupos.",
      );
      setError(mensaje);
    }
  };

  // Iniciar la competencia oficial (cambia el estado del torneo a "en_curso")
  const handleIniciarTorneo = async () => {
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
      // Ahora muestra con exactitud el detalle del backend (ej: "Con 8 grupos hacen falta al menos 16 participantes.")
      const mensaje = formatearErrorBackend(err, "Error al iniciar el torneo.");
      setError(mensaje);
    }
  };

  // Cancelar/Eliminar el torneo en borrador
  const handleCancelarTorneo = async () => {
    if (!confirm("¿Deseas cancelar este torneo?")) return;
    try {
      setError(null);
      await cancelarTorneo(torneoId);
      navigate("/torneos");
    } catch (err: unknown) {
      const mensaje = formatearErrorBackend(
        err,
        "No se pudo cancelar el torneo.",
      );
      setError(mensaje);
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
