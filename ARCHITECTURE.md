# Pocket Console — Architecture

Playful portable game console for road trips, hangouts, and casual multiplayer.

## 1. Project architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Clients (PWA / browsers on phones, tablets, laptops)       │
│  React UI · localStorage/IndexedDB · Socket.IO client       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│  Node host (Express + Next.js + Socket.IO)                  │
│  • Online: bind 0.0.0.0 on a public/VPS host                │
│  • Local Wi‑Fi: same binary, bind LAN IP + port             │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
     ┌──────────▼──────────┐   ┌──────────▼──────────┐
     │ Room Manager        │   │ Game Engine Registry│
     │ codes, membership,  │   │ shared modules used │
     │ ready state, recon  │   │ by server + client  │
     └──────────┬──────────┘   └──────────┬──────────┘
                │                         │
     ┌──────────▼─────────────────────────▼──────────┐
     │ Prisma · SQLite (dev) / PostgreSQL (prod)     │
     │ profiles, matches, badges, cosmetics          │
     └───────────────────────────────────────────────┘
```

**Key idea:** Online rooms and local-network rooms share the same Socket.IO event model and the same deterministic game modules. Only the bind address and discovery UX differ.

| Layer | Responsibility |
|-------|----------------|
| `src/components` | Reusable UI (buttons, cards, lobby, shells) |
| `src/games` | Game modules (metadata + pure state machines) |
| `src/lib` | Profiles, storage, sound, themes, socket client |
| `server` | Room lifecycle, auth of membership, action validation |
| `prisma` | Persistent profiles, stats, match history |

### Play modes

1. **Solo** — client runs the game module locally (works offline).
2. **Same-device** — client rotates turns among local seats (offline).
3. **Private room** — host creates a short code; peers join via Socket.IO.
4. **Local network** — identical to private rooms; host runs `npm run host` and shares LAN URL.

## 2. Folder structure

```
pocket-console/
├── ARCHITECTURE.md
├── README.md
├── .env.example
├── package.json
├── prisma/
│   └── schema.prisma
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   └── sw.js
├── server/
│   ├── index.ts              # Next + Socket.IO host
│   ├── rooms.ts              # In-memory room manager
│   ├── socket.ts             # Event handlers + rate limits
│   ├── network.ts            # LAN IP discovery helpers
│   └── validate.ts           # Zod payloads
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/
│   ├── games/
│   │   ├── types.ts          # Reusable GameModule interface
│   │   ├── registry.ts
│   │   ├── cards/            # Shared card utilities
│   │   ├── solitaire/
│   │   ├── color-clash/
│   │   ├── tic-tac-toe/
│   │   ├── bingo/
│   │   └── would-you-rather/
│   ├── hooks/
│   ├── lib/
│   └── generated/            # Prisma client (generated)
└── tests/
```

## 3. Database schema

See `prisma/schema.prisma`:

- **Player** — guest id, nickname, avatar, friend code, XP, prefs
- **Badge / PlayerBadge** — earnable achievements
- **Cosmetic / PlayerCosmetic** — unlockable card backs & themes
- **Match** — completed games (mode, gameId, scores, winners)
- **Challenge** — friendly player-to-player challenges
- **FavoriteGame / RecentGame** — dashboard personalization

SQLite for local/dev; set `DATABASE_URL` to Postgres in production (same schema).

## 4. Multiplayer event model

Client → Server:

| Event | Payload | Purpose |
|-------|---------|---------|
| `room:create` | `{ gameId, displayName, avatarId, mode }` | Host opens private room |
| `room:join` | `{ code, displayName, avatarId, guestId? }` | Join with room code |
| `room:leave` | `{ roomId }` | Leave lobby/game |
| `room:ready` | `{ ready: boolean }` | Toggle ready |
| `room:start` | `{}` | Host starts when all ready |
| `room:rejoin` | `{ roomId, token }` | Graceful reconnect |
| `game:action` | `{ action }` | Validated player move |
| `player:reaction` | `{ emoji }` | Preset reaction (no free chat) |
| `presence:ping` | `{ guestId }` | Nearby / LAN presence |

Server → Client:

| Event | Payload | Purpose |
|-------|---------|---------|
| `room:state` | full lobby + public game view | Sync source of truth |
| `room:error` | `{ message, code }` | User-safe errors |
| `game:state` | per-player fog-of-war view | Hidden hands etc. |
| `game:ended` | `{ winners, scores, xp }` | Results + rewards |
| `player:joined` / `player:left` | player summary | Lobby updates |
| `presence:nearby` | `{ players[] }` | Same-host discovery |
| `connection:ack` | `{ guestId, token }` | Session binding |

Server applies `validateAction` → `applyAction` → broadcasts `getClientView(state, playerId)`.

## 5. Reusable game-module interface

```ts
interface GameModule<TState, TAction> {
  meta: GameMeta; // id, title, players, tags, offline, roadTrip…
  createInitialState(ctx: InitContext): TState;
  validateAction(state, action, playerId): ValidationResult;
  applyAction(state, action, playerId): TState; // pure / deterministic
  checkWinner(state): WinResult | null;
  calculateScores(state): Record<string, number>;
  getClientView(state, playerId): unknown; // hide private info
  getLegalActions?(state, playerId): TAction[];
  aiMove?(state, playerId): TAction | null;
  serialize?(state): string;
  deserialize?(raw: string): TState;
}
```

New games = new folder + registry entry. No app restructuring required.

## 6. Local-network hosting

1. Everyone joins the same Wi‑Fi / hotspot.
2. Host runs `npm run host` (binds `0.0.0.0`, prints LAN IPs).
3. Host UI shows `http://<lan-ip>:<port>` and the room code.
4. Friends open that URL on their phones and join with the code.
5. Same Socket.IO room manager as online mode — no duplicate game logic.

## 7. Implementation milestones

| Milestone | Deliverable |
|-----------|-------------|
| M0 | Scaffold, schema, GameModule interface, registry |
| M1 | Guest profiles, home dashboard, themes, PWA shell |
| M2 | Same-device + solo: Tic-Tac-Toe, Solitaire, Bingo, WYR |
| M3 | Color Clash (original UNO-style) + room multiplayer |
| M4 | Local-network host mode + nearby players |
| M5 | XP/badges/cosmetics basics, tests, README |

MVP ships M0–M5 for the games listed in the product brief.
