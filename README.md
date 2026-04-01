**[English](README.md)** | **[한국어](README.ko.md)**

# ClippaperAI

**AI Agent Orchestration Platform** — [Paperclip](https://github.com/paperclipai/paperclip) fork with Korean language support and Slack integration.

ClippaperAI is a self-hosted Node.js server and React UI that orchestrates a team of AI agents. Assign goals, track work, manage costs, and interact with your agents — all from one dashboard and Slack.

---

## Features

### Core (from Paperclip)

- **Bring Your Own Agent** — Any agent, any runtime, one org chart
- **Goal Alignment** — Every task traces back to the company mission
- **Heartbeats** — Agents wake on schedule, check work, and act
- **Cost Control** — Monthly budgets per agent with automatic throttling
- **Governance** — Approve hires, override strategy, pause any agent
- **Org Chart** — Hierarchies, roles, reporting lines
- **Ticket System** — Every conversation traced, every decision explained
- **Mobile Ready** — Manage from anywhere

### ClippaperAI Additions

- **Slack Integration** — Bidirectional Slack bot with Socket Mode
  - `/clip agents` — View agent list
  - `/clip ask` — Create issues via modal
  - DM support — Send messages directly to the bot
  - Issue notifications — Creations, completions, failures
  - Thread replies — Add comments to issues from Slack threads
  - Reopen button — Reopen completed issues from Slack
  - Approval/Join request handling from Slack
- **Korean Localization** — Full Korean language support (UI + Slack bot)
- **DB-based Slack Config** — Manage Slack settings from the UI, no .env needed
- **In-app Setup Guide** — Step-by-step Slack configuration guide in settings page

---

## Quickstart

### Prerequisites

- Node.js 20+
- pnpm 9.15+

### Installation

```bash
git clone https://github.com/LifeMap/clippaper.git
cd clippaper
pnpm install
```

### Run (Development)

```bash
NODE_OPTIONS="--experimental-require-module" pnpm --filter @paperclipai/server dev
```

The server starts at `http://localhost:3100` with an embedded PostgreSQL database — no setup required.

### Run (Production with Cloudflare Tunnel)

```bash
#!/bin/bash
export PATH="/path/to/node/bin:$PATH"
export NODE_OPTIONS="--experimental-require-module"

cd /path/to/clippaper
nohup pnpm --filter @paperclipai/server dev > ~/.paperclip/instances/default/server.log 2>&1 &

sleep 10
cloudflared tunnel run your-tunnel-name
```

---

## Authentication

ClippaperAI supports two deployment modes:

| Mode | Description |
|------|-------------|
| `local_trusted` | No login required. Default for local development. |
| `authenticated` | Email/password login via better-auth. For external access. |

To enable authentication, add to `~/.paperclip/instances/default/.env`:

```env
PAPERCLIP_DEPLOYMENT_MODE=authenticated
BETTER_AUTH_SECRET=your-random-secret
# For external access:
PAPERCLIP_DEPLOYMENT_EXPOSURE=public
PAPERCLIP_AUTH_BASE_URL_MODE=explicit
PAPERCLIP_AUTH_PUBLIC_BASE_URL=https://your-domain.com
```

On first launch, a **board-claim URL** appears in server logs. Open it after signing up to claim admin access.

---

## Slack Bot Setup

See the full guide: [docs/guides/slack-setup.md](docs/guides/slack-setup.md)

Or use the in-app setup guide at **Settings > Slack**.

### Quick Summary

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable Socket Mode, get App Token (`xapp-`)
3. Add Bot Token Scopes: `chat:write`, `commands`, `im:history`, `im:read`, `im:write`, `channels:history`, `reactions:write`
4. Create `/clip` slash command
5. Subscribe to events: `message.im`, `message.channels`
6. Enable App Home Messages Tab
7. Install app, get Bot Token (`xoxb-`)
8. Configure in ClippaperAI UI: **Settings > Slack**

---

## Development

```bash
pnpm dev              # Full dev (API + UI, watch mode)
pnpm dev:once         # Full dev without file watching
pnpm dev:server       # Server only
pnpm build            # Build all
pnpm typecheck        # Type checking
pnpm test:run         # Run tests
pnpm db:generate      # Generate DB migration
pnpm db:migrate       # Apply migrations
```

---

## Project Structure

```
clippaper/
  packages/
    shared/           # Shared types, validators, constants
    db/               # Database schema, migrations (Drizzle ORM)
  server/             # Express API server
    src/
      slack-bot/      # Slack bot (Socket Mode)
      services/       # Business logic
      routes/         # API routes
  ui/                 # React frontend (Vite)
    src/
      i18n/locales/   # en.json, ko.json
      pages/          # Page components
  docs/
    guides/           # Setup guides
```

---

## Based On

[Paperclip](https://github.com/paperclipai/paperclip) — Open-source orchestration for AI agent companies. MIT License.

---

## License

MIT
