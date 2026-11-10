import { Router } from 'express';
import {
  actualizar,
  crear,
  eliminar,
  listar,
} from '@controllers/equipo.controller';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import {
  validarAltaEquipo,
  validarEdicionEquipo,
  validarEquipoDeLaRuta,
  validarTorneoDeLaRuta,
} from '../validators/equipo.validator';

// mergeParams: para leer :torneoId, que se define en la ruta padre
// (torneo.routes.ts, donde también se exige la sesión iniciada).
const router: Router = Router({ mergeParams: true });

router.post(
  '/',
  validarTorneoDeLaRuta,
  validarAltaEquipo,
  handleInputErrors,
  crear
);
router.get('/', validarTorneoDeLaRuta, handleInputErrors, listar);
router.patch(
  '/:id',
  validarEquipoDeLaRuta,
  validarEdicionEquipo,
  handleInputErrors,
  actualizar
);
router.delete('/:id', validarEquipoDeLaRuta, handleInputErrors, eliminar);

export default router;
