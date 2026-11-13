import { body, param } from 'express-validator';

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
