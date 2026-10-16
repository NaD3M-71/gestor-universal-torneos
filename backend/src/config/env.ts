import path from 'node:path';
import dotenv from 'dotenv';

// El .env vive en la raíz del repo (tres niveles arriba de este archivo, tanto
// en src/config como en dist/config). Si no existe, por ejemplo dentro de
// Docker, no pasa nada: las variables llegan desde el entorno del contenedor.
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const ENTORNOS = ['development', 'production', 'test'] as const;
type Entorno = (typeof ENTORNOS)[number];

const PUERTO_POR_DEFECTO = 3000;

function leerEntorno(valor: string | undefined): Entorno {
  if (valor === undefined || valor === '') {
    return 'development';
  }
  const entorno = ENTORNOS.find((e) => e === valor);
  if (entorno === undefined) {
    throw new Error(
      `NODE_ENV inválido: "${valor}". Valores permitidos: ${ENTORNOS.join(', ')}.`
    );
  }
  return entorno;
}

function leerPuerto(valor: string | undefined): number {
  if (valor === undefined || valor === '') {
    return PUERTO_POR_DEFECTO;
  }
  const puerto = Number(valor);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error(
      `PORT inválido: "${valor}". Debe ser un entero entre 1 y 65535.`
    );
  }
  return puerto;
}

function exigir(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Revisá que exista en el archivo .env.`
    );
  }
  return valor;
}

export const env = {
  NODE_ENV: leerEntorno(process.env.NODE_ENV),
  PORT: leerPuerto(process.env.PORT),
  DATABASE_URL: exigir('DATABASE_URL'),
} as const;