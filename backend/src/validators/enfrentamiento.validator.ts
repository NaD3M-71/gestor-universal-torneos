import { body, param, query } from 'express-validator';

/** Validación de los ids del torneo y del enfrentamiento en la URL. */
export const validarEnfrentamientoDeLaRuta = [
  param('torneoId')
    .isInt({ min: 1 })
    .withMessage('El id del torneo no es válido.'),
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id del enfrentamiento no es válido.'),
];

/**
 * Reglas de forma del cuerpo de PUT .../enfrentamientos/:id/resultado. Todos
 * los campos son opcionales por separado; que haya que elegir ganador o
 * empate (salvo en la ida de una serie, que lleva solo el marcador), y que el
 * marcador vaya completo, se controla en el servicio.
 */
export const validarResultado = [
  body('ganadorId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ganador debe ser el id de un equipo.'),
  body('empate')
    .optional()
    .custom((valor) => typeof valor === 'boolean')
    .withMessage('El empate debe ser true o false.'),
  body('resultadoA')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El marcador debe ser un entero desde 0.'),
  body('resultadoB')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El marcador debe ser un entero desde 0.'),
  body('comentario')
    .optional()
    .isString()
    .withMessage('El comentario debe ser un texto.')
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage('El comentario no puede superar los 255 caracteres.'),
];

/**
 * Validación de GET /api/torneos/:torneoId/enfrentamientos: el id del torneo
 * en la URL y, en la query, el faseId y la instancia, los dos opcionales.
 */
export const validarListado = [
  param('torneoId')
    .isInt({ min: 1 })
    .withMessage('El id del torneo no es válido.'),
  query('faseId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El id de la fase no es válido.'),
  query('instancia')
    .optional()
    .isString()
    .withMessage('La instancia debe ser un texto.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('La instancia debe tener entre 1 y 50 caracteres.'),
];
