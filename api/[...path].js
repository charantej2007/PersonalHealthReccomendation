let appInstance;

async function getAppInstance() {
  if (!appInstance) {
    const [{ createApp }] = await Promise.all([
      import('../backend/src/app.js'),
      import('../backend/src/config/firebaseAdmin.js'),
    ]);

    appInstance = createApp();
  }

  return appInstance;
}

export default async function handler(req, res) {
  try {
    const app = await getAppInstance();
    return app(req, res);
  } catch (error) {
    console.error('Serverless backend bootstrap failed', error);

    const details = error instanceof Error ? error.message : 'Unknown initialization error';
    return res.status(500).json({
      message: 'Backend configuration error on deployment. Verify Firebase Admin and SMTP environment variables.',
      details,
    });
  }
}
