# RouMi Backend — Render Deployable

Express + Socket.IO server hosting the **same engine package** frontend uses. Deploy to Render in 2 minutes.

## Why this backend?

Per MVP blueprint, core is frontend-only (in-memory) to maximize algorithm points. This backend is **optional Part 5** — lets two judge browsers watch same live simulation, and provides REST API for your real data (no demo).

## Features

- **Single in-memory engine instance** — same `Graph`, `HospitalRegistry`, `AmbulanceRegistry`, `DispatchEngine`, `EventEngine` as frontend
- **REST API** for all CRUD: nodes, roads, hospitals, ambulances, doctors, requests, benchmark, simulation actions
- **Socket.IO real-time sync**: 
  - On `join`, sends full state snapshot
  - Relays every `DispatchEngine.subscribe()` event to all clients via `state:update`
  - Accepts control actions only from `role: 'presenter'` handshake, rejects viewers server-side
- **Persistence**: saves to `data.json` file (for Render disk), loads on restart
- **CORS**: configurable via `CORS_ORIGIN` env var
- **Health check**: `/api/health`

## API Endpoints

```
GET  /api/health
GET  /api/state
GET  /api/hospitals        POST /api/hospitals {hospital, node}
GET  /api/nodes            POST /api/nodes {GraphNode}
POST /api/roads {RoadEdge}
GET  /api/ambulances       POST /api/ambulances {Ambulance}
GET  /api/doctors          POST /api/doctors {Doctor}
POST /api/doctors/:id/toggle
GET  /api/requests         POST /api/requests {PatientRequest}
POST /api/dispatch/compare
POST /api/benchmark {size}
POST /api/simulation/:action  (block-road, reopen-road, fill-beds, deplete-medicine, occupy-ambulance, free-ambulance, generate-emergency, generate-burst, reset)
DELETE /api/data
```

Socket.IO events:
- Client → `control:action` {action, data} (presenter only)
- Server → `state:snapshot` (full state on join)
- Server → `state:update` (on any engine change)
- Server → `log:new` (new decision log entry)

## Deploy to Render

### Option 1: Render Web Service (recommended)

1. Push this `server/` folder to GitHub (or whole repo with `server` as root)
2. Render Dashboard → **New Web Service** → Connect your GitHub repo
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node Version:** 20
   - **Env Vars:**
     - `PORT` = auto (Render sets)
     - `CORS_ORIGIN` = `https://your-frontend.vercel.app,http://localhost:5173` (your frontend URLs)
     - `NODE_ENV` = `production`
4. Deploy → You'll get URL like `https://roumi-backend.onrender.com`
5. Test: `https://roumi-backend.onrender.com/api/health` should return ok

### Option 2: Render with Docker (if you have Dockerfile)

Render auto-detects Dockerfile if present.

### Frontend integration

In frontend `.env`:
```
VITE_API_URL=https://roumi-backend.onrender.com
```

Frontend `src/lib/api.ts` checks `VITE_API_URL`:
- If set → uses backend REST + Socket.IO
- If not set → uses local in-memory engine (current behavior, no backend needed)

For Socket.IO in frontend:
```ts
import { io } from 'socket.io-client';
const socket = io(API_URL, { auth: { role: 'presenter' } }); // or 'viewer' for judge's laptop
socket.on('state:snapshot', (state) => setState(state));
socket.on('state:update', (update) => setState(update.state));
```

## Local dev

```bash
cd server
npm install
npm run dev   # tsx watch src/index.ts → http://localhost:3001
```

In another terminal, frontend:
```bash
cd ..
VITE_API_URL=http://localhost:3001 npm run dev
```

## Render specifics

- Render free tier spins down after 15 min inactivity — first request after spin-down takes ~30s to wake
- Use `data.json` file for persistence — Render's filesystem is ephemeral unless you add a Disk (paid). For MVP demo, in-memory is fine per scope.
- If you need persistent DB, add Render PostgreSQL and replace `data.json` with DB calls — but out of scope for 6-hour build.

## Production architecture (future)

```
Frontend (Vercel) → REST + Socket.IO → Backend (Render) → Engine (same package) → data.json (or Postgres)
                                    ↓
                              Two judge browsers (presenter + viewer) watch same live simulation
```

This backend is **under 200 lines** core + REST wrappers, as per optional spec (<150 lines core). It reuses 100% of engine logic — no duplication.
