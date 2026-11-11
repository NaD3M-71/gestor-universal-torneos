import { Router } from 'express';
import {
  actualizar,
  crear,
  eliminar,
  iniciar,
  listar,
  obtener,
  cancelar,
} from '@controllers/torneo.controller';
import { autenticar } from '../middlewares/autenticar';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import equipoRoutes from './equipo.routes';
import grupoRoutes from './grupo.routes';
import enfrentamientoRoutes from './enfrentamiento.routes';
import {
  validarAltaTorneo,
  validarEdicionTorneo,
  validarIdTorneo,
} from '../validators/torneo.validator';

const router: Router = Router();

// Todas las rutas de torneos exigen sesión iniciada.
router.use(autenticar);

// Equipos e integrantes cuelgan del torneo: /api/torneos/:torneoId/equipos
router.use('/:torneoId/equipos', equipoRoutes);

// Asignación de equipos a grupos: /api/torneos/:torneoId/grupos
router.use('/:torneoId/grupos', grupoRoutes);

// Resultados de los enfrentamientos: /api/torneos/:torneoId/enfrentamientos
router.use('/:torneoId/enfrentamientos', enfrentamientoRoutes);

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
router.patch('/:id/iniciar', validarIdTorneo, handleInputErrors, iniciar);
router.delete('/:id', validarIdTorneo, handleInputErrors, eliminar);

export default router;
