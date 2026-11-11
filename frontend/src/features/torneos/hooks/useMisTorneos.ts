import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerTorneos } from "../service/torneoService";
import type { Torneo, EstadoTorneo } from "../types/torneo.types";

export const useMisTorneos = () => {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [pestanaActiva, setPestanaActiva] = useState<EstadoTorneo>("en_curso");
  const [torneoSeleccionado, setTorneoSeleccionado] = useState<Torneo | null>(
    null,
  );
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarTorneos = async () => {
      try {
        const data = await obtenerTorneos();
        setTorneos(data);
      } catch (error) {
        console.error("Error al cargar torneos", error);
      }
    };

    cargarTorneos();
  }, []);

  // Filtrar torneos según la pestaña activa
  const torneosFiltrados = torneos.filter((t) => {
    if (pestanaActiva === "en_curso") return t.estado === "en_curso";
    return t.estado === pestanaActiva;
  });

  // Lógica de redirección según el estado del torneo al hacer clic en "Ver / Editar"
  const handleAccionTorneo = (torneo: Torneo) => {
    if (torneo.estado === "borrador") {
      navigate(`/torneos/${torneo.id}/editar`);
    } else if (torneo.estado === "en_curso") {
      navigate(`/torneos/${torneo.id}/gestion`);
    } else {
      setTorneoSeleccionado(torneo);
      setModalAbierto(true);
    }
  };

  const handleCrearTorneo = () => {
    navigate("/torneos/nuevo");
  };

  return {
    torneosFiltrados,
    pestanaActiva,
    setPestanaActiva,
    modalAbierto,
    setModalAbierto,
    torneoSeleccionado,
    handleAccionTorneo,
    handleCrearTorneo,
  };
};
