import { body, param } from 'express-validator';
import { FormatoTorneo, SistemaPuntuacion } from '@prisma/enums';

const LARGO_MAXIMO_NOMBRE = 150;
const MINIMO_PARTICIPANTES = 2;
const MAXIMO_PARTICIPANTES = 128;
const MINIMO_GRUPOS = 2;

const FORMATOS = Object.values(FormatoTorneo);
const SISTEMAS_PUNTUACION = Object.values(SistemaPuntuacion);

/**
 * Reglas de forma de cada campo del torneo. Con obligatorio = true (alta) los
 * campos requeridos deben venir; con obligatorio = false (edición) todos son
 * opcionales, pero los que lleguen se validan igual.
 *
 * Las reglas que cruzan varios campos (grupos según el formato, potencia de 2,
 * participantes por grupo) no van acá: en la edición hay que combinarlas con
 * lo ya guardado, así que las resuelve el servicio.
 */
const reglasTorneo = (obligatorio: boolean) => {
  const campo = (nombre: string) =>
    obligatorio ? body(nombre) : body(nombre).optional();

  return [
    campo('nombre')
      .isString()
      .withMessage('El nombre es obligatorio.')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('El nombre es obligatorio.')
      .bail()
      .isLength({ max: LARGO_MAXIMO_NOMBRE })
      .withMessage(
        `El nombre no puede superar los ${LARGO_MAXIMO_NOMBRE} caracteres.`
      ),
    campo('formato')
      .isIn(FORMATOS)
      .withMessage(`El formato debe ser uno de: ${FORMATOS.join(', ')}.`),
    campo('sistemaPuntuacion')
      .isIn(SISTEMAS_PUNTUACION)
      .withMessage(
        `El sistema de puntuación debe ser uno de: ${SISTEMAS_PUNTUACION.join(', ')}.`
      ),
    campo('cantidadParticipantes')
      .isInt({ min: MINIMO_PARTICIPANTES, max: MAXIMO_PARTICIPANTES })
      .withMessage(
        `La cantidad de participantes debe ser un entero entre ${MINIMO_PARTICIPANTES} y ${MAXIMO_PARTICIPANTES}.`
      )
      .bail()
      .toInt(),

    // Los tres siguientes admiten null (por ejemplo, para quitar los grupos
    // al cambiar de formato) y se tratan igual que si no vinieran.
    body('descripcion')
      .optional({ values: 'null' })
      .isString()
      .withMessage('La descripción debe ser texto.')
      .bail()
      .trim(),
    body('cantidadGrupos')
      .optional({ values: 'null' })
      .isInt({ min: MINIMO_GRUPOS })
      .withMessage(
        `La cantidad de grupos debe ser un entero de ${MINIMO_GRUPOS} o más.`
      )
      .bail()
      .toInt(),
    // Solo fecha, sin hora: toDate() la deja en UTC a medianoche, que es lo
    // que espera la columna DATE.
    body('fechaInicio')
      .optional({ values: 'null' })
      .isDate({ format: 'YYYY-MM-DD', strictMode: true })
      .withMessage('La fecha de inicio debe tener el formato AAAA-MM-DD.')
      .bail()
      .toDate(),
  ];
};

/** Validaciones del cuerpo de POST /api/torneos. */
export const validarAltaTorneo = reglasTorneo(true);

/** Validaciones del cuerpo de PATCH /api/torneos/:id (todos los campos opcionales). */
export const validarEdicionTorneo = reglasTorneo(false);

/** Validación del id en la URL de las rutas /api/torneos/:id. */
export const validarIdTorneo = [
  param('id').isInt({ min: 1 }).withMessage('El id del torneo no es válido.'),
];
