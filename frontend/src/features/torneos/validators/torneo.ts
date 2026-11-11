import { z } from "zod";
import { esPotenciaDeDos } from "../utils/torneoCalculos";

export const crearTorneoSchema = z
  .object({
    nombre: z
      .string()
      .min(1, "El nombre es obligatorio.")
      .max(150, "El nombre no puede superar los 150 caracteres."),
    descripcion: z.string().optional(),
    formato: z.enum([
      "liga_simple",
      "liga_doble",
      "eliminacion_simple",
      "eliminacion_doble",
      "liguilla_eliminacion",
      "grupos_eliminatorias",
    ]),
    sistemaPuntuacion: z.enum([
      "ganada_perdida",
      "futbol_clasico",
      "sistema_alternativo",
    ]),
    fechaInicio: z.string().optional(),

    participantesPorGrupo: z.number().min(2, "Mínimo 2 por grupo.").optional(),
    cantidadGrupos: z.number().nullable().optional(),
    cantidadParticipantes: z
      .number("Debe ser un numero entero entre 2 y 128")
      .min(2, "El torneo requiere al menos 2 participantes.")
      .max(
        128,
        "El torneo no puede superar el límite de 128 participantes en total.",
      ),
    lineaCorte: z
      .number()
      .min(1, "Debe clasificar al menos 1 por grupo.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // FASE DE GRUPOS + ELIMINATORIAS
    if (data.formato === "grupos_eliminatorias") {
      if (!data.cantidadGrupos) {
        ctx.addIssue({
          code: "custom",
          path: ["cantidadGrupos"],
          message: "Seleccioná la cantidad de grupos.",
        });
      } else if (!esPotenciaDeDos(data.cantidadGrupos)) {
        // Seguridad adicional si se altera el selector
        ctx.addIssue({
          code: "custom",
          path: ["cantidadGrupos"],
          message:
            "La cantidad de grupos debe ser potencia de 2 (2, 4, 8, 16...).",
        });
      }

      if (data.participantesPorGrupo && data.lineaCorte) {
        if (data.lineaCorte >= data.participantesPorGrupo) {
          ctx.addIssue({
            code: "custom",
            path: ["lineaCorte"],
            message:
              "No pueden clasificar todos ni más de los que integran el grupo.",
          });
        }
      }
    }

    // LIGUILLA + PLAYOFFS
    if (data.formato === "liguilla_eliminacion") {
      if (data.lineaCorte && data.cantidadParticipantes) {
        if (data.lineaCorte >= data.cantidadParticipantes) {
          ctx.addIssue({
            code: "custom",
            path: ["lineaCorte"],
            message:
              "Los clasificados deben ser menores al total de participantes en fase regular.",
          });
        }
      }
    }
  });

export type CrearTorneoForm = z.infer<typeof crearTorneoSchema>;
