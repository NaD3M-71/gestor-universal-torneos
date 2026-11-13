import { body, param } from 'express-validator';

/**
 * Validación de PATCH /api/torneos/:torneoId/fases/:faseId/cerrar: los ids del
 * torneo y de la fase en la URL.
 */
export const validarCierreDeFase = [
  param('torneoId')
    .isInt({ min: 1 })
    .withMessage('El id del torneo no es válido.'),
  param('faseId')
    .isInt({ min: 1 })
    .withMessage('El id de la fase no es válido.'),
];

/**
 * Validación de GET /api/torneos/:torneoId/fases/:faseId/empates: los mismos
 * ids en la URL que el cierre de fase.
 */
export const validarEmpatesDeFase = validarCierreDeFase;

/**
 * Validación de PUT /api/torneos/:torneoId/fases/:faseId/desempate: los ids de
 * la URL, `orden` (ids de equipos, del mejor al peor, sin repetir, al menos 2)
 * y `comentario` opcional (texto, o null para borrarlo).
 */
export const validarDesempate = [
  ...validarCierreDeFase,
  body('orden')
    .isArray({ min: 2 })
    .withMessage('El orden tiene que ser una lista de al menos 2 equipos.'),
  body('orden.*')
    .isInt({ min: 1 })
    .withMessage('Cada equipo del orden tiene que ser un id válido.')
    .toInt(),
  body('orden')
    .custom((orden: number[]) => new Set(orden).size === orden.length)
    .withMessage('El orden no puede repetir equipos.'),
  body('comentario')
    .optional({ values: 'null' })
    .isString()
    .withMessage('El comentario tiene que ser texto.')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('El comentario no puede superar los 1000 caracteres.'),
];
