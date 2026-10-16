import { Router } from 'express';
import { obtenerEstado } from '../controllers/health.controller';

const router = Router();

router.get('/', obtenerEstado);

export default router;