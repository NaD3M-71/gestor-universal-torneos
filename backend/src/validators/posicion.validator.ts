import { param, query } from 'express-validator';

/**
 * Validación de GET /api/torneos/:torneoId/posiciones: el id del torneo en la
 * URL y el faseId opcional en la query (sin faseId se usa la fase activa).
 */
export const validarPosiciones = [
  param('torneoId')
    .isInt({ min: 1 })
    .withMessage('El id del torneo no es válido.'),
  query('faseId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El id de la fase no es válido.'),
];
