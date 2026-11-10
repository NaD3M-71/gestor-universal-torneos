import { Router } from 'express';
import {
  actualizar,
  crear,
  eliminar,
  listar,
  obtener,
  cancelar,
} from '@controllers/torneo.controller';
import { autenticar } from '../middlewares/autenticar';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import {
  validarAltaTorneo,
  validarEdicionTorneo,
  validarIdTorneo,
} from '../validators/torneo.validator';

const router: Router = Router();

// Todas las rutas de torneos exigen sesión iniciada.
router.use(autenticar);

router.post('/', validarAltaTorneo, handleInputErrors, crear);
router.get('/', listar);
router.get('/:id', validarIdTorneo, handleInputErrors, obtener);
router.patch(
  '/:id',
  validarIdTorneo,
  validarEdicionTorneo,
  handleInputErrors,
  actualizar
);
router.patch('/:id/cancelar', autenticar, cancelar);
router.delete('/:id', validarIdTorneo, handleInputErrors, eliminar);

export default router;
