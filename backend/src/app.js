import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import usersRouter from './routes/users.routes.js';
import healthRouter from './routes/health.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'personal-health-backend' });
  });

  app.use('/api/users', usersRouter);
  app.use('/api', healthRouter);

  app.use(errorHandler);

  return app;
}
