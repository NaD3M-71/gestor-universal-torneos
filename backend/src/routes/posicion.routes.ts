import { Router } from 'express';
import { obtener } from '@controllers/posicion.controller';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import { validarPosiciones } from '../validators/posicion.validator';

// mergeParams: para leer :torneoId, que se define en la ruta padre
// (torneo.routes.ts, donde también se exige la sesión iniciada).
const router: Router = Router({ mergeParams: true });

router.get('/', validarPosiciones, handleInputErrors, obtener);

export default router;
