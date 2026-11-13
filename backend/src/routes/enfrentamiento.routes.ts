import { Router } from 'express';
import { cargar, listar } from '@controllers/enfrentamiento.controller';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import {
  validarEnfrentamientoDeLaRuta,
  validarListado,
  validarResultado,
} from '../validators/enfrentamiento.validator';

// mergeParams: para leer :torneoId, que se define en la ruta padre
// (torneo.routes.ts, donde también se exige la sesión iniciada).
const router: Router = Router({ mergeParams: true });

router.get('/', validarListado, handleInputErrors, listar);

router.put(
  '/:id/resultado',
  validarEnfrentamientoDeLaRuta,
  validarResultado,
  handleInputErrors,
  cargar
);

export default router;
