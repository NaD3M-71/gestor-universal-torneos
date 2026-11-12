import { Router } from 'express';
import { obtener } from '@controllers/bracket.controller';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import { validarBracket } from '../validators/bracket.validator';

// mergeParams: para leer :torneoId, que se define en la ruta padre
// (torneo.routes.ts, donde también se exige la sesión iniciada).
const router: Router = Router({ mergeParams: true });

router.get('/', validarBracket, handleInputErrors, obtener);

export default router;
