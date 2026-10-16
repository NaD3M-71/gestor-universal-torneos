import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app: Application = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', routes);

// Manejo de errores: siempre al final, después de todas las rutas
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
