import { createApp } from './app.js';
import { env } from './config/env.js';
import './config/firebaseAdmin.js';
import { startMonitoringJob } from './services/monitoringJob.js';

const app = createApp();

app.listen(env.BACKEND_PORT, () => {
  console.log(`Backend listening on http://localhost:${env.BACKEND_PORT}`);
});

startMonitoringJob();
