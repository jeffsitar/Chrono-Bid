# Chrono Bid — Build & Deployment Guide

## Folder tree

```
chrono-bid/
├── apps/
│   ├── server/                 # Node + Express + Socket.io backend (deploy to Render)
│   │   └── src/
│   │       ├── index.ts        # entrypoint, HTTP + Socket.io server, /health route
│   │       ├── config.ts       # PORT / CLIENT_ORIGIN env vars
│   │       ├── rooms/          # RoomManager, Room (game state + lifecycle)
│   │       ├── socket/         # registerHandlers.ts — all socket event wiring
│   │       ├── game/           # AntiCheat.ts
│   │       └── utils/
│   └── web/                    # Next.js frontend (deploy to Netlify)
│       ├── src/app/            # App Router: page.tsx (lobby), room/[roomId]/page.tsx (game)
│       │                       #   + loading.tsx / error.tsx / not-found.tsx (Phase 7)
│       ├── src/components/     # UI + 3D scene (components/game/scene/*)
│       ├── src/hooks/          # useSocket, useGameState, useHoldInteraction, usePrefersReducedMotion
│       ├── src/lib/            # socketClient, formatTime, sound
│       └── tests/              # vitest unit tests (Phase 7)
├── packages/
│   ├── game-engine/            # pure game logic: timer, round/game resolvers, AI bot, FSM (has vitest suite)
│   └── shared-types/           # shared TS types + Socket.io event contracts (single source of truth)
├── netlify.toml                # frontend deploy config
├── render.yaml                 # backend deploy config (Render Blueprint)
└── package.json                # npm workspaces root
```

## Build instructions (local)

```bash
npm install                 # installs all workspaces at once
npm run build                # type-checks server + builds shared packages + builds web
npm run test -w packages/game-engine   # 27 unit tests — game logic
npm run test -w apps/web               # 12 unit tests — UI/formatting logic
```

Run locally:
```bash
npm run dev -w apps/server   # http://localhost:4000
npm run dev -w apps/web      # http://localhost:3000
```

---

## Deploying the backend to Render (you asked specifically about this)

The backend (`apps/server`) is a long-running Socket.io server, so it needs a **Web Service**, not a static site or serverless function.

**Step-by-step:**

1. Push this repo to GitHub (Render deploys from a git repo, not a zip upload).
2. In the Render dashboard: **New → Blueprint**, and point it at your repo. Render will detect `render.yaml` at the repo root and pre-fill everything below automatically. (If you'd rather not use the Blueprint, do **New → Web Service** instead and fill in the same fields manually.)
3. Confirm/set these fields:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start -w apps/server`
   - **Health Check Path:** `/health`
4. Environment variables (Render dashboard → your service → Environment):
   - `PORT` — Render sets this automatically; you don't need to add it (the server already reads `process.env.PORT`).
   - `CLIENT_ORIGIN` — **set this to your Netlify site's URL**, e.g. `https://chrono-bid.netlify.app`. This is required — the server's CORS/Socket.io origin check will reject your frontend's connections without it. If you have both a preview and production Netlify URL, separate them with a comma: `https://chrono-bid.netlify.app,https://deploy-preview-1--chrono-bid.netlify.app`.
5. Deploy. Render gives you a URL like `https://chrono-bid-server.onrender.com`. Confirm it's alive by visiting `https://chrono-bid-server.onrender.com/health` — you should see `{"ok":true,...}`.
6. **Free-tier note:** Render's free web services spin down after ~15 minutes idle and take ~30-60s to wake back up on the next request. The first player to open the game after idle time will see a slow initial connection — this is a Render platform behavior, not a bug in this app. Upgrade to a paid instance to avoid it.

## Deploying the frontend to Netlify

You said you already know Netlify, so briefly: this repo includes `netlify.toml` with `base = "apps/web"` and the `@netlify/plugin-nextjs` plugin already configured, since this is an npm-workspaces monorepo (Netlify needs to know to build from `apps/web` but install from the repo root). The one thing you must set manually:

- **Site settings → Environment variables** → add `NEXT_PUBLIC_SERVER_URL` = your Render URL (e.g. `https://chrono-bid-server.onrender.com`). This is a public/build-time variable — it's how the frontend knows which backend to open a Socket.io connection to.

Deploy order matters once: deploy the Render backend first (so you have its URL for step above), then set that URL in Netlify before your first Netlify build.
