import app from './app';
import { env } from './config/env';
import { prisma } from './infrastructure/database';

async function bootstrap() {
  try {
    // Probar conexión a PostgreSQL
    // $connect() no abre ninguna conexión cuando se usa el adaptador de pg (el
    // pool conecta recién en la primera consulta), así que se hace una consulta
    // mínima para comprobar de verdad que la base responde.
    await prisma.$queryRaw`SELECT 1`;
    console.log('Conexión exitosa a PostgreSQL con Prisma.');

    // Levantar el servidor Express
    app.listen(env.PORT, (error?: Error) => {
      if (error) {
        console.error('Error al levantar el servidor:', error);
        process.exit(1);
      }
      console.log(`Servidor corriendo en http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

bootstrap();
