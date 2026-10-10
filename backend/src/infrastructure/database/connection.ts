import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    '❌ No se encontró process.env.DATABASE_URL. Verifica que el archivo .env esté cargado correctamente.'
  );
}

export const db = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export const testDatabaseConnection = async (): Promise<void> => {
  try {
    await db.authenticate();
    console.log(' Conexión exitosa a PostgreSQL con Sequelize.');
  } catch (error) {
    console.error(' Error al conectar con la base de datos:', error);
  }
};