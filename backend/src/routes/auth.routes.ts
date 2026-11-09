import { Router } from 'express';
import { registrar } from '../controllers/auth.controller';
import { handleInputErrors } from '../middlewares/handleInputErrors';
import { validarRegistro } from '../validators/auth.validator';

const router = Router();

router.post('/registro', validarRegistro, handleInputErrors, registrar);

export default router;
