import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearTorneo } from "../service/torneoService";
import { crearTorneoSchema, type CrearTorneoForm } from "../validators/torneo";
import { type CrearTorneoDTO } from "../types/torneo.types";
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
      idaYVuelta: false,
    },
  });

  const navigate = useNavigate();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const formato = watch("formato");
  const cantidadGrupos = watch("cantidadGrupos") || 0;
  const participantesPorGrupo = watch("participantesPorGrupo") || 0;
  const lineaCorte = watch("lineaCorte") || 0;
  const cantidadParticipantes = watch("cantidadParticipantes") || 0;
  const idaYVuelta = watch("idaYVuelta") || false;

  const esGruposEliminatorias = formato === "grupos_eliminatorias";
  const esLiguilla = formato === "liguilla_eliminacion";
  const esEliminacionPura =
    formato === "eliminacion_simple" || formato === "eliminacion_doble";

  // Limpiar y sincronizar parámetros al cambiar de formato
  useEffect(() => {
    setValue("idaYVuelta", false);

    if (formato === "eliminacion_simple" || formato === "eliminacion_doble") {
      setValue("sistemaPuntuacion", "ganada_perdida");
    }

    if (formato === "grupos_eliminatorias") {
      setValue("lineaCorte", 2);
    } else if (formato === "liguilla_eliminacion") {
      setValue(
        "lineaCorte",
        Math.min(4, Math.max(2, cantidadParticipantes - 1)),
      );
    } else {
      setValue("lineaCorte", null);
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
      const esFormatoMixto = esGruposEliminatorias || esLiguilla;

      const payload: CrearTorneoDTO = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        formato: data.formato,
        sistemaPuntuacion: data.sistemaPuntuacion,
        cantidadParticipantes: Number(data.cantidadParticipantes),
        fechaInicio: data.fechaInicio || null,
        lineaDeCorte: esFormatoMixto ? Number(data.lineaCorte) : null,
        idaYVuelta: esFormatoMixto ? Boolean(data.idaYVuelta) : false,
        cantidadGrupos: esGruposEliminatorias
          ? Number(data.cantidadGrupos)
          : null,
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
    idaYVuelta,
    resumen,
    errorGeneral,
  };
};
