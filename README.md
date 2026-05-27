# whoop-mcp

[![CI](https://github.com/souravpn/whoop-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/souravpn/whoop-mcp/actions/workflows/ci.yml)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives Claude access to your WHOOP biometric data — recovery, sleep, strain, and workouts.

Ask Claude things like:

- _"How's my recovery today?"_
- _"How did I sleep last night?"_
- _"How has my HRV trended this week?"_
- _"What was my strain from yesterday's workout?"_

---

## Privacy

This app accesses your WHOOP data locally on your device. No data is sent to any third-party server.

---

## Tools

| Tool                  | What it returns                                                       |
| --------------------- | --------------------------------------------------------------------- |
| `get_recovery`        | Recovery score, HRV, resting HR, SpO2                                 |
| `get_sleep`           | Sleep duration, stages (light/deep/REM), efficiency, respiratory rate |
| `get_strain`          | Day strain score, avg/max HR, calories                                |
| `get_latest_workout`  | Most recent workout — sport, duration, strain, HR zones               |
| `get_recovery_trend`  | Recovery scores over N days (default 7)                               |
| `get_sleep_trend`     | Sleep data over N days (default 7)                                    |
| `get_workout_history` | Recent workout history (default 5)                                    |
| `get_profile`         | Profile + body measurements                                           |

---

## Setup

### 1. Create a WHOOP developer app

1. Go to [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com)
2. Sign in with your WHOOP account
3. Create a new App:
   - Name: `whoop-mcp` (or anything)
   - Redirect URI: `http://localhost:8080/callback`
   - Scopes: select all read scopes + `offline`
4. Copy your **Client ID** and **Client Secret**

### 2. Install

```bash
npm install -g whoop-mcp
```

### 3. Run one-time auth setup

This opens your browser, you log into WHOOP, and your tokens are saved to `~/.whoop-mcp-tokens.json`:

```bash
WHOOP_CLIENT_ID=your_id WHOOP_CLIENT_SECRET=your_secret whoop-mcp-auth-setup
```

You only need to do this once. The server will auto-refresh tokens after that.

### 4. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "whoop": {
      "command": "whoop-mcp",
      "env": {
        "WHOOP_CLIENT_ID": "your_client_id",
        "WHOOP_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

Restart Claude Desktop. You should see a green "running" badge in **Settings → Developer**.

### 5. Test it

Open a new chat and ask:

```
How's my recovery today?
```

---

## Example queries

**Daily check-in:**

```
What's my recovery, sleep, and strain for today?
```

**Trend analysis:**

```
How has my HRV trended over the past 7 days?
```

**Workout correlation:**

```
Look at my workouts this week and my recovery scores
the day after each one. Is there a pattern?
```

**Full briefing:**

```
Give me a complete health briefing — recovery, last
night's sleep breakdown, and any workouts from yesterday
```

---

## Pairing with Oura

If you also use Oura Ring, you can run both MCP servers together and ask Claude to cross-reference:

```json
{
  "mcpServers": {
    "whoop": {
      "command": "/path/to/whoop-mcp",
      "env": { "WHOOP_ACCESS_TOKEN": "your_whoop_token" }
    },
    "oura": {
      "command": "/path/to/oura-mcp",
      "env": { "OURA_ACCESS_TOKEN": "your_oura_token" }
    }
  }
}
```

Then ask:

```
Compare my WHOOP and Oura HRV readings for this week.
Do they agree? Which is trending higher?
```

---

## Development

```bash
git clone https://github.com/yourusername/whoop-mcp
cd whoop-mcp
npm install
npm run build

# Test locally
WHOOP_ACCESS_TOKEN=your_token node dist/index.js
```

### Project structure

```
whoop-mcp/
├── src/
│   ├── index.ts   # MCP server + tool definitions
│   └── whoop.ts   # WHOOP API client + formatters
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

PRs welcome. Some ideas for extension:

- Heart rate time series data
- Sleep stage timeline (light/deep/REM per hour)
- Strain goal recommendations
- Weekly summary tool

---

## License

MIT

---

## Acknowledgements

Built with the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) and the [WHOOP Developer API](https://developer.whoop.com).
