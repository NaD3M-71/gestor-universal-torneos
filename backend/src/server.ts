import 'dotenv/config';
import app from './app';
import { db } from './infrastructure/database/connection';

const PORT = process.env.PORT;
console.log(PORT);

async function bootstrap() {
  try {
    // Probar conexión a PostgreSQL
    await db.authenticate();
    console.log(' Conexión exitosa a PostgreSQL con Sequelize.');

    // Sincronizar modelos
    await db.sync({ alter: true });
    console.log(' Modelos sincronizados correctamente.');

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