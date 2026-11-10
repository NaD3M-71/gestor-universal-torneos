import { Router } from 'express';
import {
  login,
  logout,
  registrar,
  usuarioActual,
} from '../controllers/auth.controller';
import { autenticar } from '../middlewares/autenticar';
import { handleInputErrors } from '../middlewares/errors/handleInputErrors';
import { validarLogin, validarRegistro } from '../validators/auth.validator';

const router: Router = Router();

router.post('/registro', validarRegistro, handleInputErrors, registrar);
router.post('/login', validarLogin, handleInputErrors, login);
router.post('/logout', logout);
router.get('/yo', autenticar, usuarioActual);

export default router;
