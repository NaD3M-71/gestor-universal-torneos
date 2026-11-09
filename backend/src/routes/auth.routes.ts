import { Router } from 'express';
import { login, logout, registrar } from '../controllers/auth.controller';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import { validarLogin, validarRegistro } from '../validators/auth.validator';

const router = Router();

router.post('/registro', validarRegistro, handleInputErrors, registrar);
router.post('/login', validarLogin, handleInputErrors, login);
router.post('/logout', logout);

export default router;
