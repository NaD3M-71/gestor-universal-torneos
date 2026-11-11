import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearTorneo } from "../service/torneoService";
import { crearTorneoSchema, type CrearTorneoForm } from "../validators/torneo";
import {
  calcularLlaveAsimetrica,
  esPotenciaDeDos,
} from "../utils/torneoCalculos";

export const useCrearTorneo = () => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CrearTorneoForm>({
    resolver: zodResolver(crearTorneoSchema),
    defaultValues: {
      formato: "liga_simple",
      sistemaPuntuacion: "futbol_clasico",
      cantidadParticipantes: 4,
      cantidadGrupos: null,
      participantesPorGrupo: 4,
      lineaCorte: 2,
    },
  });

  const navigate = useNavigate();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const formato = watch("formato");
  const cantidadGrupos = watch("cantidadGrupos") || 0;
  const participantesPorGrupo = watch("participantesPorGrupo") || 0;
  const lineaCorte = watch("lineaCorte") || 0;
  const cantidadParticipantes = watch("cantidadParticipantes") || 0;

  const esGruposEliminatorias = formato === "grupos_eliminatorias";
  const esLiguilla = formato === "liguilla_eliminacion";
  const esEliminacionPura =
    formato === "eliminacion_simple" || formato === "eliminacion_doble";

  // Sincronizar sistema de puntuación según formato
  useEffect(() => {
    if (formato === "eliminacion_simple" || formato === "eliminacion_doble") {
      setValue("sistemaPuntuacion", "ganada_perdida");
    }
  }, [formato, setValue]);

  // Sincronización automática de participantes en formato grupos
  useEffect(() => {
    if (esGruposEliminatorias && cantidadGrupos && participantesPorGrupo) {
      setValue("cantidadParticipantes", cantidadGrupos * participantesPorGrupo);
    }
  }, [esGruposEliminatorias, cantidadGrupos, participantesPorGrupo, setValue]);

  //Sincronizar y recortar lineaCorte si excede el tamaño del grupo en Grupos + Eliminatorias
  useEffect(() => {
    if (esGruposEliminatorias && participantesPorGrupo > 1) {
      if (lineaCorte >= participantesPorGrupo) {
        setValue("lineaCorte", participantesPorGrupo - 1, {
          shouldValidate: true,
        });
      }
    }
  }, [esGruposEliminatorias, participantesPorGrupo, lineaCorte, setValue]);

  //Sincronizar y recortar lineaCorte si excede el total en Liguilla
  useEffect(() => {
    if (esLiguilla && cantidadParticipantes > 1) {
      if (lineaCorte >= cantidadParticipantes) {
        setValue("lineaCorte", cantidadParticipantes - 1, {
          shouldValidate: true,
        });
      }
    }
  }, [esLiguilla, cantidadParticipantes, lineaCorte, setValue]);

  // Cálculos dinámicos del resumen
  const resumen = useMemo(() => {
    const totalClasificados = esGruposEliminatorias
      ? cantidadGrupos * lineaCorte
      : esLiguilla
        ? lineaCorte
        : cantidadParticipantes;

    const infoLlave =
      esGruposEliminatorias || esLiguilla || esEliminacionPura
        ? calcularLlaveAsimetrica(totalClasificados)
        : null;

    const tieneByesGrupos =
      esGruposEliminatorias &&
      participantesPorGrupo % 2 !== 0 &&
      participantesPorGrupo > 0;
    const tieneByesEliminacionPura =
      esEliminacionPura &&
      cantidadParticipantes > 0 &&
      !esPotenciaDeDos(cantidadParticipantes);

    return {
      totalParticipantes: cantidadParticipantes,
      totalClasificados,
      infoLlave,
      tieneByesGrupos,
      tieneByesEliminacionPura,
    };
  }, [
    esGruposEliminatorias,
    esLiguilla,
    esEliminacionPura,
    cantidadGrupos,
    lineaCorte,
    participantesPorGrupo,
    cantidadParticipantes,
  ]);

  const onSubmit = async (data: CrearTorneoForm) => {
    try {
      setErrorGeneral(null);

      const payload = {
        ...data,
        cantidadGrupos: esGruposEliminatorias
          ? Number(data.cantidadGrupos)
          : null,
        cantidadParticipantes: Number(data.cantidadParticipantes),
        lineaCorte:
          esGruposEliminatorias || esLiguilla ? Number(data.lineaCorte) : null,
        descripcion: data.descripcion?.trim() || null,
        fechaInicio: data.fechaInicio || null,
      };

      const nuevoTorneo = await crearTorneo(payload);
      navigate(`/torneos/${nuevoTorneo.id}/editar`);
    } catch (err: unknown) {
      console.error("Error al crear el torneo:", err);
      setErrorGeneral(
        (err as { response?: { data?: { error?: { mensaje?: string } } } })
          ?.response?.data?.error?.mensaje ||
          "Ocurrió un error al crear el torneo.",
      );
    }
  };

  return {
    register,
    onSubmit: handleSubmit(onSubmit),
    errors,
    isSubmitting,
    esGruposEliminatorias,
    esLiguilla,
    formato,
    cantidadGrupos,
    participantesPorGrupo,
    lineaCorte,
    resumen,
    errorGeneral,
  };
};
