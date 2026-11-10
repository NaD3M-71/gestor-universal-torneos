import { body, param } from 'express-validator';

const LARGO_MAXIMO_NOMBRE = 100;

/**
 * Reglas de forma del cuerpo de un equipo. Con obligatorio = true (alta) el
 * nombre debe venir; con obligatorio = false (edición) todo es opcional, pero
 * lo que llegue se valida igual. Los integrantes son una lista de nombres.
 */
const reglasEquipo = (obligatorio: boolean) => {
  const nombre = obligatorio ? body('nombre') : body('nombre').optional();

  return [
    nombre
      .isString()
      .withMessage('El nombre del equipo es obligatorio.')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('El nombre del equipo es obligatorio.')
      .bail()
      .isLength({ max: LARGO_MAXIMO_NOMBRE })
      .withMessage(
        `El nombre del equipo no puede superar los ${LARGO_MAXIMO_NOMBRE} caracteres.`
      ),
    body('integrantes')
      .optional()
      .isArray()
      .withMessage('Los integrantes deben enviarse como una lista de nombres.'),
    body('integrantes.*')
      .isString()
      .withMessage('Cada integrante debe tener un nombre.')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('Cada integrante debe tener un nombre.')
      .bail()
      .isLength({ max: LARGO_MAXIMO_NOMBRE })
      .withMessage(
        `El nombre de un integrante no puede superar los ${LARGO_MAXIMO_NOMBRE} caracteres.`
      ),
  ];
};

/** Validaciones del cuerpo de POST /api/torneos/:torneoId/equipos. */
export const validarAltaEquipo = reglasEquipo(true);

/** Validaciones del cuerpo de PATCH /api/torneos/:torneoId/equipos/:id. */
export const validarEdicionEquipo = reglasEquipo(false);

/** Validación del id del torneo en la URL. */
export const validarTorneoDeLaRuta = [
  param('torneoId')
    .isInt({ min: 1 })
    .withMessage('El id del torneo no es válido.'),
];

/** Validación de los ids del torneo y del equipo en la URL. */
export const validarEquipoDeLaRuta = [
  ...validarTorneoDeLaRuta,
  param('id').isInt({ min: 1 }).withMessage('El id del equipo no es válido.'),
];
