import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);

// A medida que se sumen módulos se registran acá, por ejemplo:
// router.use('/torneos', torneoRoutes);

export default router;