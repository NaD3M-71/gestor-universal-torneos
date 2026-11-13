import { param } from 'express-validator';

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
