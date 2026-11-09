import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errors/errorHandler';

const app: Application = express();

app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Rutas
app.use('/api', routes);

// Manejo de errores: siempre al final, después de todas las rutas
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
