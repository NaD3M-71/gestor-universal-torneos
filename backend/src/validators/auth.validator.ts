import { body } from 'express-validator';

const LARGO_MAXIMO_NOMBRE = 100;
const LARGO_MAXIMO_EMAIL = 150;
const LARGO_MINIMO_CONTRASENIA = 8;
// bcrypt solo usa los primeros 72 bytes de la contraseña.
const BYTES_MAXIMOS_CONTRASENIA = 72;

/** Campo de texto obligatorio, sin espacios sobrantes y con largo máximo. */
const textoObligatorio = (campo: string, etiqueta: string, maximo: number) =>
  body(campo)
    .isString()
    .withMessage(`${etiqueta} es obligatorio.`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${etiqueta} es obligatorio.`)
    .bail()
    .isLength({ max: maximo })
    .withMessage(`${etiqueta} no puede superar los ${maximo} caracteres.`);

/** Validaciones del cuerpo de POST /api/auth/registro. */
export const validarRegistro = [
  textoObligatorio('nombre', 'El nombre', LARGO_MAXIMO_NOMBRE),
  textoObligatorio('apellido', 'El apellido', LARGO_MAXIMO_NOMBRE),
  body('email')
    .isString()
    .withMessage('El email es obligatorio.')
    .bail()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('El email no es válido.')
    .bail()
    .isLength({ max: LARGO_MAXIMO_EMAIL })
    .withMessage(
      `El email no puede superar los ${LARGO_MAXIMO_EMAIL} caracteres.`
    ),
  // La contraseña no se recorta: los espacios forman parte de ella.
  body('contrasenia')
    .isString()
    .withMessage('La contraseña es obligatoria.')
    .bail()
    .isLength({ min: LARGO_MINIMO_CONTRASENIA })
    .withMessage(
      `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENIA} caracteres.`
    )
    .bail()
    .isByteLength({ max: BYTES_MAXIMOS_CONTRASENIA })
    .withMessage(
      `La contraseña no puede superar los ${BYTES_MAXIMOS_CONTRASENIA} caracteres.`
    ),
];

/**
 * Validaciones del cuerpo de POST /api/auth/login. Solo se exige que lleguen
 * los dos datos: si no coinciden con un usuario, el caso de uso responde 401.
 * No se aplican las reglas de largo del registro para no revelar cuáles son.
 */
export const validarLogin = [
  body('email')
    .isString()
    .withMessage('El email es obligatorio.')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('El email es obligatorio.'),
  body('contrasenia')
    .isString()
    .withMessage('La contraseña es obligatoria.')
    .bail()
    .notEmpty()
    .withMessage('La contraseña es obligatoria.'),
];
