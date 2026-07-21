# Chrono Bid

A real-time multiplayer time-bidding duel — original mechanic, no assets or
branding from any TV show. Built as an npm-workspaces monorepo.

## Status

- **Phase 1–3** — shared types, pure game-engine (round/tie-break/AI-bot logic,
  unit tested), and the Node/Express/Socket.io server (room manager, server-
  authoritative timers, anti-cheat, reconnection, bot takeover). ✅
- **Phase 4** — full frontend UI: landing page, create/join room, lobby /
  waiting room, live game HUD with a 3D round table, scoreboard, countdown,
  result screens, spectator mode, mobile layout, sound, dark futuristic
  glassmorphic design. ✅
- **Verified & bug-fixed pass** — integrated every phase into this single
  project, deleted dead/orphaned code, and fixed several real bugs (see
  "What was fixed" below). The full create-room → get-code → join-from-
  another-device → play-a-round flow is verified against a live server with
  an automated two-client test (`_live-flow-test.cjs`), not just read over. ✅

## What was fixed in this pass

1. **Deploy-breaking bug**: the server's production start command
   (`node dist/index.js`) couldn't load `packages/shared-types` /
   `packages/game-engine`, whose `package.json` point at uncompiled
   TypeScript source. This would have crashed immediately on a real host.
   Fixed by running the server via `tsx` in production too (same mechanism
   already proven in dev) — confirmed by actually running `npm start` and
   creating a room against it.
2. **Kick-player bug**: a kicked player's socket was never notified and
   never removed from the room's broadcast channel, because the player
   record was deleted before the notification callback ran. Fixed the
   ordering.
3. Added missing `eslint` / `eslint-config-next` to the web app (lint was
   silently failing to even load its config).
4. Removed a build-time dependency on fetching fonts from Google at build
   time (`next/font/google`) in favor of the CSS fallback stack already
   defined in `globals.css` — same look, zero external network dependency
   during build.
5. Deleted an entire orphaned `packages/shared` directory left over from an
   earlier phase and superseded by `shared-types` + `game-engine` (confirmed
   nothing imported it before deleting).

## Project layout

```
apps/
  server/   Express + Socket.io backend (all game rules run here)
  web/      Next.js + TypeScript + Tailwind + Framer Motion frontend
packages/
  game-engine/   Pure, unit-tested bidding/round/AI logic (Vitest)
  shared-types/  Types + Socket.io event contracts shared by both apps
```

## Running it locally

Requires Node 18+.

```bash
npm install          # installs all workspaces
cp apps/server/.env.example apps/server/.env
npm run dev           # runs the server (:4000) and web app (:3000) together
```

Then open http://localhost:3000, enter a nickname, create a room, and open
the invite link (or just the room code) in a second tab — or on another
device on the same network using your machine's LAN IP instead of
`localhost` — to play.

To run just one side: `npm run dev:server` or `npm run dev:web`.

### Frontend env

`apps/web` reads `NEXT_PUBLIC_SERVER_URL` (defaults to `http://localhost:4000`)
to know where the Socket.io server lives — this **must** point at your
deployed backend URL in production, or other players' devices will try to
reach `localhost` on their own machine and fail to connect.

## Deploying (Netlify + Render)

**Important:** Netlify hosts static/serverless frontends — it does not run a
persistent Node process, and Socket.io needs one. So this is a two-host
deploy: **frontend on Netlify, backend on Render (or Railway / Fly.io /
any host that runs a long-lived Node process)**.

### 1. Backend → Render

1. New "Web Service" on Render, point it at this repo.
2. Root directory: `apps/server`. Build command: `npm install`. Start
   command: `npm start` (already produces a long-running process — no
   separate build step needed, see "What was fixed" #1 above for why).
3. Set env vars: `PORT` (Render sets this automatically — leave it),
   `CLIENT_ORIGIN` = your Netlify site URL (e.g.
   `https://chrono-bid.netlify.app`) so CORS allows it.
4. Note the resulting Render URL, e.g. `https://chrono-bid-server.onrender.com`.

### 2. Frontend → Netlify

1. New site from this repo. Base directory: `apps/web`. Build command:
   `npm install && npm run build`. Publish directory: `apps/web/.next`
   (use the official Next.js Netlify plugin, or Netlify's auto-detected
   Next.js runtime — either works with this app router setup).

   **If you see `"Your publish directory is pointing to the base directory"`**:
   this repo's `netlify.toml` already sets base/publish correctly, but a
   manually-set "Publish directory" in Site settings → Build & deploy →
   Continuous deployment overrides the toml file. Go there and either clear
   the field (so `netlify.toml` takes over) or set it explicitly to
   `apps/web/.next`, then re-deploy.
2. Set env var `NEXT_PUBLIC_SERVER_URL` = your Render URL from step 1
   (e.g. `https://chrono-bid-server.onrender.com`). This is a **build-time**
   variable — set it before building, not after.
3. Deploy. Share the Netlify URL; anyone who opens it can create or join a
   room, and the code they generate/enter routes them to the same Render
   backend regardless of what device they're on.

### Sanity-check after deploying

Open the site on two different devices (or one device + one phone on
cellular data, to rule out same-LAN coincidences), create a room on one,
join with the code on the other, and play a round. If the second device
can't connect, it's almost always `NEXT_PUBLIC_SERVER_URL` not being set (or
being set after the build instead of before) or `CLIENT_ORIGIN` on the
server not matching the Netlify URL exactly (including `https://`, no
trailing slash).

## Game engine tests

```bash
npm run test -w packages/game-engine
```

Covers bid-clamping math, round-winner tie-breaks (highest bid → earliest
release → join order), final-standings tie-breaks, and AI bot bounds.

## Live multiplayer flow test

```bash
npm run dev -w apps/server   # in one terminal
node _live-flow-test.cjs      # in another, once the server is up
```

Drives two real Socket.io clients through the exact user flow — create
room, join with the generated code from a second "device", ready up, start,
play a full round via real hold/release timing, and confirm both clients
independently converge on the same winner — against a live server, not
mocks.

## Design notes

- The server is the only clock that matters: every press/release timestamp
  is stamped with `Date.now()` on receipt, never trusted from the client.
- The 3D table (`apps/web/src/components/game/scene`) is built with React
  Three Fiber using stylized glassmorphic avatars — no external 3D assets.
- All sound effects are synthesized in-browser via the Web Audio API
  (`apps/web/src/lib/sound.ts`) — nothing to license or ship.
