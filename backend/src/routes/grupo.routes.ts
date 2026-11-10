import { Router } from 'express';
import {
  asignarGruposDelTorneo,
  sortearGruposDelTorneo,
} from '@controllers/equipo.controller';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import {
  validarAsignacionGrupos,
  validarTorneoDeLaRuta,
} from '../validators/equipo.validator';

// mergeParams: para leer :torneoId, que se define en la ruta padre
// (torneo.routes.ts, donde también se exige la sesión iniciada).
const router: Router = Router({ mergeParams: true });

router.put(
  '/',
  validarTorneoDeLaRuta,
  validarAsignacionGrupos,
  handleInputErrors,
  asignarGruposDelTorneo
);
router.post(
  '/sorteo',
  validarTorneoDeLaRuta,
  handleInputErrors,
  sortearGruposDelTorneo
);

export default router;
