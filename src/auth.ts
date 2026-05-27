// =============================================================================
// auth.ts — WHOOP OAuth2 token manager
//
// WHOOP uses OAuth2 authorization code flow. Access tokens expire every ~hour.
// This module:
//   1. Loads tokens from a local JSON file (~/.whoop-mcp-tokens.json)
//   2. Checks expiry before every API call
//   3. Refreshes automatically using the refresh token
//   4. Saves updated tokens back to disk
//
// INITIAL SETUP (one-time):
//   You need to do the first OAuth flow manually to get your initial tokens.
//   Run: node dist/auth-setup.js
//   This starts a local server, opens your browser, and saves your tokens.
//
// TOKEN FILE (~/.whoop-mcp-tokens.json):
//   {
//     "access_token": "...",
//     "refresh_token": "...",
//     "expires_at": 1234567890000   ← ms since epoch
//   }
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const TOKEN_FILE = join(homedir(), '.whoop-mcp-tokens.json');
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

// Buffer: refresh 5 minutes before actual expiry
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export interface TokenStore {
  access_token: string;
  refresh_token: string;
  expires_at: number;   // ms since epoch
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

// ---- Token file I/O ---------------------------------------------------------

export function loadTokens(): TokenStore {
  if (!existsSync(TOKEN_FILE)) {
    throw new Error(
      `No WHOOP tokens found at ${TOKEN_FILE}.\n` +
      `Run: node dist/auth-setup.js\n` +
      `This will open your browser to authorize the app and save your tokens.`
    );
  }
  try {
    const raw = readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(raw) as TokenStore;
  } catch {
    throw new Error(`Failed to parse token file at ${TOKEN_FILE}. Try running auth-setup again.`);
  }
}

export function saveTokens(tokens: TokenStore): void {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 }); // owner read/write only
  process.stderr.write(`[whoop-mcp] Tokens saved to ${TOKEN_FILE}\n`);
}

// ---- Token refresh ----------------------------------------------------------

export function isExpired(tokens: TokenStore): boolean {
  return Date.now() >= tokens.expires_at - EXPIRY_BUFFER_MS;
}

export async function refreshTokens(
  tokens: TokenStore,
  config: OAuthConfig
): Promise<TokenStore> {
  process.stderr.write('[whoop-mcp] Access token expired — refreshing...\n');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to refresh WHOOP token (${response.status}): ${text}\n` +
      `Your refresh token may have expired. Run: node dist/auth-setup.js`
    );
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;   // seconds
  };

  const newTokens: TokenStore = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? tokens.refresh_token, // WHOOP may or may not rotate refresh token
    expires_at: Date.now() + data.expires_in * 1000,
  };

  saveTokens(newTokens);
  process.stderr.write('[whoop-mcp] Token refreshed successfully\n');
  return newTokens;
}

// ---- Token manager class ----------------------------------------------------
// Used by WhoopClient to get a always-valid access token

export class TokenManager {
  private tokens: TokenStore;
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.tokens = loadTokens();
  }

  async getAccessToken(): Promise<string> {
    if (isExpired(this.tokens)) {
      this.tokens = await refreshTokens(this.tokens, this.config);
    }
    return this.tokens.access_token;
  }
}
