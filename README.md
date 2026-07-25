# Pocket Console

A playful, mobile-friendly mini-game console for road trips, hangouts, and casual multiplayer.

Play solo, pass-and-play on one device, create a private room for friends on their phones, or host over local Wi‑Fi when the internet is unavailable.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design, the game-module interface, Socket.IO events, and milestones.

## Games (15)

| Game | Modes |
|------|--------|
| Solitaire | Solo, offline, save/resume |
| Color Clash | Solo vs bot, same-device, private/local rooms |
| Tic-Tac-Toe | Solo vs CPU, same-device, online rooms |
| Road-Trip Bingo | Solo / same-device / rooms |
| Would You Rather | Solo / same-device / rooms |
| War | Solo vs CPU, same-device, rooms |
| Go Fish | Solo vs CPU, same-device, rooms |
| Memory Match | Solo / same-device / rooms |
| Crazy Eights | Solo vs CPU, same-device, rooms |
| Connect Four | Solo vs CPU, same-device, rooms |
| Rock Paper Scissors | Solo vs CPU, same-device, rooms |
| Trivia | Solo / same-device / rooms |
| Charades | Same-device / rooms |
| Twenty Questions | Same-device / rooms |
| License Plate Hunt | Solo / same-device / rooms |

## Quick start

```bash
cd pocket-console
cp .env.example .env
npm install
npm run icons
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js + Socket.IO on one port (multiplayer ready) |
| `npm run host` | Same as dev, prints LAN join banner |
| `npm run dev:next` | Next only (no Socket.IO host) |
| `npm run build` / `npm start` | Production build + host |
| `npm test` | Vitest game-engine tests |
| `npm run db:push` | Sync Prisma schema (SQLite) |
| `npm run db:seed` | Seed badges & cosmetics |

## Environment variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
# NEXT_PUBLIC_SOCKET_URL=   # leave empty to use same origin
```

For production Postgres:

```env
DATABASE_URL="postgresql://user:pass@host:5432/pocket_console?schema=public"
```

## Local-network testing

1. Connect phones/laptops to the same Wi‑Fi or hotspot.
2. On the host machine: `npm run host`
3. Note the printed URLs, e.g. `http://192.168.1.20:3000`
4. On the host browser: **Create Room** (or open a game → Private room).
5. On friend devices: open the host URL → enter the room code → Ready → host starts.

Online private rooms and local-network rooms share the same room manager and game modules; only the bind address / discovery UX differs.

## Offline / PWA

- Installable via the browser “Add to Home Screen” flow (`manifest.webmanifest` + service worker).
- Solo and same-device modes work offline once the shell is cached.
- Profiles, favorites, recents, prefs, and solitaire progress persist in `localStorage`.
- Multiplayer rooms attempt automatic rejoin after brief disconnects.

## Privacy & safety

- Guest nicknames + avatars only (no email/phone required).
- Private rooms by default with short random codes.
- Preset emoji reactions instead of free-form chat.
- Zod validation + rate limiting on Socket.IO events.
- Server validates every multiplayer action before applying state.

## Project layout

```
server/           # Socket.IO + Next custom host
src/games/        # Game modules (pure logic)
src/components/   # UI + game views
src/app/          # Next.js routes
prisma/           # Schema + seed
tests/            # Engine unit tests
```

## Adding a game

1. Create `src/games/<id>/index.ts` implementing `GameModule`.
2. Register it in `src/games/registry.ts`.
3. Add a local view under `src/components/games/` and wire `/play/[gameId]`.
4. Optionally add an online renderer in `OnlineGameView.tsx`.

## License

Original project code and Color Clash branding are provided for this application. Do not copy trademarked game assets or interfaces from other companies.
