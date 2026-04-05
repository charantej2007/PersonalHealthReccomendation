
  # Personalized Health Recommendation UI

  This is a code bundle for Personalized Health Recommendation UI. The original project is available at https://www.figma.com/design/LVeFNYL5iU9tpoblexvFIr/Personalized-Health-Recommendation-UI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Firebase Setup

  1. Copy `.env.example` to `.env.local`.
  2. Fill in your Firebase Web SDK values in `.env.local`:

  ```env
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=...
  VITE_FIREBASE_PROJECT_ID=...
  VITE_FIREBASE_STORAGE_BUCKET=...
  VITE_FIREBASE_MESSAGING_SENDER_ID=...
  VITE_FIREBASE_APP_ID=...
  VITE_FIREBASE_MEASUREMENT_ID=...
  ```

  3. Start the app again:

  ```bash
  npm run dev -- --port 5174
  ```

  ### Firestore Database Service

  Firebase app initialization: `src/app/lib/firebase.ts`

  Health data CRUD helpers: `src/app/services/healthDataService.ts`

  ### Important Security Note

  - Never put Firebase Admin service account keys in frontend code or `.env.local`.
  - If a private key has been exposed, revoke and regenerate it immediately in Google Cloud IAM.
  - Admin SDK keys must only be used on a trusted backend/server.

  ## Backend Setup (Express + Firebase Admin)

  This backend supports:
  - user profile collection (basic details)
  - daily BP/Sugar uploads
  - personalized recommendations (exercise, yoga, food)
  - suspicious value notifications and optional push alerts

  1. Create backend env file:

  ```bash
  cp .env.example .env.backend
  ```

  2. Fill backend values in `.env.backend`:

  ```env
  BACKEND_PORT=8080
  FIREBASE_PROJECT_ID=...
  FIREBASE_CLIENT_EMAIL=...
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
  FIREBASE_DATABASE_URL=
  ```

  3. Start backend:

  ```bash
  npm run backend:dev
  ```

  Backend health check:
  - `GET /api/health`

  Core API endpoints:
  - `POST /api/users`
  - `GET /api/users/:userId`
  - `PUT /api/users/:userId`
  - `POST /api/users/:userId/device-token`
  - `POST /api/users/:userId/vitals`
  - `GET /api/users/:userId/vitals?limit=30`
  - `GET /api/users/:userId/recommendations/latest`
  - `GET /api/users/:userId/notifications`
  - `PATCH /api/notifications/:notificationId/read`

  Backend source folder:
  - `backend/src`

  ## Frontend-Backend Routing Flow

  - Signup screen creates user via `POST /api/users`, stores returned `userId` in local storage.
  - Login screen resolves user by email via `GET /api/users?email=...`, then stores `userId`.
  - Splash redirects to `/home` when session exists; otherwise `/login`.
  - Home/Profile read user data from backend using stored `userId`.
  - Enter Data screen updates profile height/weight and posts daily vitals.
  - After vitals upload, app routes to Recommendations screen to fetch latest generated plan.

  Frontend integration files:
  - `src/app/services/apiClient.ts`
  - `src/app/services/backendService.ts`
  - `src/app/services/sessionService.ts`
  