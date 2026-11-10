import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import torneoRoutes from './torneo.routes';

const router: Router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/torneos', torneoRoutes);

export default router;
