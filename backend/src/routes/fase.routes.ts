import { Router } from 'express';
import { cerrar } from '@controllers/fase.controller';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import { validarCierreDeFase } from '../validators/fase.validator';

// mergeParams: para leer :torneoId, que se define en la ruta padre
// (torneo.routes.ts, donde también se exige la sesión iniciada).
const router: Router = Router({ mergeParams: true });

router.patch('/:faseId/cerrar', validarCierreDeFase, handleInputErrors, cerrar);

export default router;
