import { createApp } from '../backend/src/app.js';
import '../backend/src/config/firebaseAdmin.js';

let appInstance;

function getAppInstance() {
  if (!appInstance) {
    appInstance = createApp();
  }

  return appInstance;
}

export default function handler(req, res) {
  return getAppInstance()(req, res);
}
