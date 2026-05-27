#!/usr/bin/env node
// =============================================================================
// auth-setup.ts — one-time OAuth2 setup for WHOOP
//
// Run this ONCE to get your initial access + refresh tokens.
// After that, the MCP server handles refreshing automatically.
//
// USAGE:
//   node dist/auth-setup.js
//
// WHAT IT DOES:
//   1. Reads WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET from env
//   2. Starts a local HTTP server on port 8080
//   3. Prints an authorization URL — open it in your browser
//   4. You log into WHOOP and authorize the app
//   5. WHOOP redirects back to localhost:8080 with an auth code
//   6. The script exchanges the code for tokens
//   7. Saves tokens to ~/.whoop-mcp-tokens.json
//   8. Done — you can now run the MCP server
//
// GETTING CLIENT_ID AND CLIENT_SECRET:
//   1. Go to https://developer-dashboard.whoop.com
//   2. Sign in with your WHOOP account
//   3. Create a new App:
//      - Name: "whoop-mcp" (or anything)
//      - Redirect URI: http://localhost:8080/callback
//      - Scopes: select all read scopes + offline
//   4. Copy the Client ID and Client Secret
//   5. Run: WHOOP_CLIENT_ID=xxx WHOOP_CLIENT_SECRET=yyy node dist/auth-setup.js
// =============================================================================
import { createServer } from 'http';
import { saveTokens } from './auth.js';
const clientId = process.env.WHOOP_CLIENT_ID;
const clientSecret = process.env.WHOOP_CLIENT_SECRET;
if (!clientId || !clientSecret) {
    console.error('Missing required env variables.');
    console.error('Usage: WHOOP_CLIENT_ID=xxx WHOOP_CLIENT_SECRET=yyy node dist/auth-setup.js');
    process.exit(1);
}
const REDIRECT_URI = 'http://localhost:8080/callback';
const AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const SCOPES = 'offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement';
// Generate a random state string for CSRF protection
const state = Math.random().toString(36).substring(2, 18);
// Build the authorization URL
const authUrl = new URL(AUTH_URL);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', state);
console.log('\n=== WHOOP MCP — One-time Auth Setup ===\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${authUrl.toString()}\n`);
console.log('2. Log in to WHOOP and authorize the app');
console.log('3. You\'ll be redirected back here automatically\n');
console.log('Waiting for authorization...\n');
// Start local server to receive the redirect
const server = createServer(async (req, res) => {
    if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    const url = new URL(req.url, 'http://localhost:8080');
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
        console.error(`Authorization failed: ${error}`);
        server.close();
        process.exit(1);
    }
    if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>State mismatch — possible CSRF attack</h1>');
        console.error('State mismatch');
        server.close();
        process.exit(1);
    }
    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>No authorization code received</h1>');
        server.close();
        process.exit(1);
    }
    // Exchange code for tokens
    console.log('Authorization code received — exchanging for tokens...');
    try {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
        });
        const tokenResponse = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        if (!tokenResponse.ok) {
            const text = await tokenResponse.text();
            throw new Error(`Token exchange failed (${tokenResponse.status}): ${text}`);
        }
        const data = await tokenResponse.json();
        saveTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
        });
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
      <h1>✅ Authorization successful!</h1>
      <p>Your WHOOP tokens have been saved to <code>~/.whoop-mcp-tokens.json</code></p>
      <p>You can close this tab and start using the MCP server.</p>
    `);
        console.log('\n✅ Success! Tokens saved to ~/.whoop-mcp-tokens.json');
        console.log('\nAdd this to your claude_desktop_config.json:\n');
        console.log(JSON.stringify({
            mcpServers: {
                whoop: {
                    command: 'whoop-mcp', // or full path
                    env: {
                        WHOOP_CLIENT_ID: clientId,
                        WHOOP_CLIENT_SECRET: clientSecret,
                    },
                },
            },
        }, null, 2));
        console.log('\nThe server will auto-refresh tokens using the saved refresh token.\n');
    }
    catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${err}</p>`);
        console.error('Token exchange failed:', err);
    }
    server.close();
    process.exit(0);
});
server.listen(8080, () => {
    // Try to auto-open the browser on macOS
    import('child_process').then(({ exec }) => {
        exec(`open "${authUrl.toString()}"`);
    }).catch(() => {
        // Non-macOS — user opens manually
    });
});
//# sourceMappingURL=auth-setup.js.map