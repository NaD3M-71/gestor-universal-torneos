import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// A medida que se sumen módulos se registran acá, por ejemplo:
// router.use('/torneos', torneoRoutes);

export default router;