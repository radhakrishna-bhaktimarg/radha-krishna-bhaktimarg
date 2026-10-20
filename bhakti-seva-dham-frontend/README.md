# Radha Krishna Bhaktimarg

Radha Krishna Bhaktimarg is a devotional web platform for spiritual learning, daily Katha reading, quiz participation, Naam Jap practice, Bhajan listening, voluntary Seva pledges, and community rankings.

The application is a full-stack JavaScript project with a React/Vite frontend, an Express/MongoDB backend, JWT authentication, and Vercel deployment support.

## Features

### Devotee experience

- Devotee registration and login
- Protected routes and authenticated profile data
- Daily Katha reading with multilingual content
- Daily quiz based on the current Katha
- One quiz attempt per day
- Quiz score and completion-time tracking
- Active-quiz protection when navigating to another route
- Quiz progress restoration after a page reload
- Project-themed quiz leave confirmation dialog
- Daily leaderboard with:
  - Combined Bhakti ranking
  - Quiz ranking
  - Naam Jap ranking
  - Historical day selection
  - Ten entries per request
  - Load More pagination
- Naam Jap counter and daily mala synchronization
- Bhajan and Mantra gallery
- Persistent audio player across internal route changes
- Play/pause, previous/next, repeat mode, stop, and seek controls
- Media Session support where the browser/device provides it
- Voluntary Seva pledge and transaction history
- Responsive desktop and mobile navigation

### Administration

- Admin-protected dashboard
- Devotee statistics
- Devotee listing
- Daily Katha and quiz content management
- Multilingual quiz content support
- Bhajan management
- Leaderboard rollover controls
- Seva verification and analytics

## Technology Stack

### Frontend

- React 19
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- Lucide React
- Oxlint

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- bcryptjs password hashing
- node-cron daily rollover job
- Google Translate API helper for multilingual content
- CORS and dotenv

### Deployment

- Frontend: Vercel
- Backend: Vercel-compatible Express API or a Node.js server
- Database: MongoDB-compatible deployment such as MongoDB Atlas

## Project Structure

```text
.
├── backend/
│   ├── api/                 # Vercel API entry point
│   ├── config/              # Database configuration
│   ├── cron/                # Daily leaderboard rollover
│   ├── middleware/          # Authentication middleware
│   ├── models/              # Mongoose models
│   ├── routes/              # Express API routes
│   ├── utils/               # Shared backend helpers
│   ├── app.js               # Express application
│   ├── server.js            # Local Node.js server entry point
│   ├── package.json
│   └── vercel.json
└── bhakti-seva-dham-frontend/
    ├── public/              # Static assets
    ├── src/
    │   ├── api/             # Frontend API helpers
    │   ├── components/      # Shared UI components
    │   ├── context/         # Authentication and audio state
    │   ├── pages/           # Application routes
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── README.md
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB database
- A JWT secret
- Google Translate credentials/configuration if translation features are enabled

## Local Development

The frontend and backend run as separate applications.

### 1. Install backend dependencies

From the repository root:

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=<long-random-secret>
APP_TIME_ZONE=Asia/Kolkata
CRON_SECRET=<long-random-cron-secret>
```

Add any translation-provider variables required by the translation helper in the deployment environment. Never commit `.env` files or credentials.

Start the backend:

```bash
npm run dev
```

The local API is available at `http://localhost:5000/api`.

### 2. Install frontend dependencies

Open a second terminal from the repository root:

```bash
cd bhakti-seva-dham-frontend
npm install
```

For local development, configure the frontend API URL in `bhakti-seva-dham-frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Vite will print the local development URL, normally `http://localhost:5173`.

## Frontend Commands

Run these commands from `bhakti-seva-dham-frontend`:

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
npm run lint      # Run Oxlint
```

## Backend API Areas

The backend mounts the following route groups under `/api`:

| Route | Purpose |
|---|---|
| `/api/auth` | Registration, login, profile, and authenticated user data |
| `/api/quiz` | Daily Katha, quiz submission, and admin Katha management |
| `/api/jap` | Naam Jap synchronization and statistics |
| `/api/leaderboard` | Current and historical leaderboard data |
| `/api/seva` | Seva pledges, history, verification, and analytics |
| `/api/bhajans` | Bhajan listing and administration |
| `/api/admin` | Admin statistics, devotee data, and question management |

Authenticated requests use a JWT bearer token:

```http
Authorization: Bearer <token>
```

## Leaderboard Behavior

- Daily dates use the configured application timezone, defaulting to `Asia/Kolkata`.
- Only devotees who performed relevant activity on the selected day are included.
- Quiz activity and Naam Jap activity are recorded as they happen.
- Daily entries are persisted before rollover so historical rankings are not reconstructed from reset user fields.
- Results are paginated in groups of ten.
- Historical snapshots preserve completed-day rankings.

## Daily Quiz Behavior

- The current Katha and quiz response is cached briefly in the browser session to avoid unnecessary repeated requests.
- A user can submit only one daily attempt.
- Starting the quiz stores the active quiz state in session storage.
- Current answers, language, question position, and timer state are restored after a reload during the same browser session.
- Internal navigation during an active quiz opens a themed confirmation modal.
- Confirming submission includes unanswered questions as incorrect answers.
- Refresh and close warnings are provided through the browser's native `beforeunload` dialog. Browser-controlled dialogs cannot be restyled by website code.

## Audio Behavior

The audio player is mounted at the application shell level so it remains available while navigating between routes. It supports progress seeking and Media Session controls where supported by the browser.

Background playback and lock-screen behavior depend on the browser, operating system, device power settings, and the media provider. Mobile browsers may pause embedded media after the device is locked; guaranteed lock-screen playback requires direct audio files or streams played through an HTML audio element.

## Deployment

### Frontend on Vercel

1. Set the Vercel project root to `bhakti-seva-dham-frontend`.
2. Use the Vite build command:

   ```bash
   npm run build
   ```

3. Use `dist` as the output directory.
4. Configure `VITE_API_URL` or `VITE_API_BASE_URL` for the deployed backend when required.
5. Deploy the `main` branch.

### Backend on Vercel or Node.js hosting

1. Set the backend project root to `backend`.
2. Configure `MONGO_URI`, `JWT_SECRET`, `APP_TIME_ZONE`, and `CRON_SECRET`.
3. Confirm the deployment exposes the API under `/api`.
4. Confirm the frontend production API URL points to the deployed backend.

The backend includes a Vercel rewrite configuration for `/api/*` requests and a scheduled rollover at `18:30 UTC` (midnight in Asia/Kolkata). Vercel authenticates that request with `CRON_SECRET`. The rollover also runs as a guarded fallback when a user opens Naam Jap after a missed schedule.

## Security and Configuration Notes

- Keep MongoDB credentials, JWT secrets, and translation credentials in environment variables.
- Do not commit `.env` files or production tokens.
- Use HTTPS in production.
- Keep the backend CORS policy and authentication middleware enabled.
- Admin routes must remain protected by the backend authentication and role checks.
- Review MongoDB backups and Vercel environment variables before transferring ownership.

## Production Checklist

- [ ] Configure production MongoDB and verify indexes
- [ ] Configure `JWT_SECRET`
- [ ] Configure `CRON_SECRET`
- [ ] Configure the application timezone
- [ ] Configure translation services, if used
- [ ] Configure frontend production API URL
- [ ] Verify registration and login
- [ ] Verify daily Katha and quiz submission
- [ ] Verify leaderboard today, historical dates, and Load More
- [ ] Verify Naam Jap synchronization
- [ ] Verify Seva pledge and admin verification flow
- [ ] Verify Bhajan playback and route changes
- [ ] Verify admin-only routes
- [ ] Run the frontend production build
- [ ] Check Vercel deployment logs after release

## Validation

The final frontend build can be checked with:

```bash
cd bhakti-seva-dham-frontend
npm run build
npm run lint
```

## License

This project is maintained for the Radha Krishna Bhaktimarg devotional platform. Add the project's chosen distribution or ownership terms here before publishing the source outside the organization.
