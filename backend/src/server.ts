import 'dotenv/config';
import app from './app';
import { prisma } from './infrastructure/database';

const PORT = process.env.PORT;
console.log(PORT);

async function bootstrap() {
  try {
    // Probar conexión a PostgreSQL
    await prisma.$connect();
    console.log(' Conexión exitosa a PostgreSQL con Prisma.');

    // Levantar el servidor Express
    app.listen(PORT, () => {
      console.log(` Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(' Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

bootstrap();
