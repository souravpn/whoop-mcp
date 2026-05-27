#!/usr/bin/env node
// =============================================================================
// index.ts — whoop-mcp server
//
// Exposes WHOOP data as MCP tools that Claude can call.
//
// TOOLS:
//   get_recovery        — today's recovery score, HRV, resting HR
//   get_sleep           — last night's sleep breakdown
//   get_strain          — today's day strain and calories
//   get_latest_workout  — most recent workout
//   get_recovery_trend  — recovery scores over N days
//   get_sleep_trend     — sleep data over N days
//   get_workout_history — recent workouts
//   get_profile         — user profile and body measurements
//
// AUTH:
//   Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET env variables.
//   Run: node dist/auth-setup.js  (one-time setup — opens browser, saves tokens)
//   Tokens are auto-refreshed and stored in ~/.whoop-mcp-tokens.json
//
// USAGE IN claude_desktop_config.json:
//   {
//     "mcpServers": {
//       "whoop": {
//         "command": "/path/to/whoop-mcp",
//         "env": { "WHOOP_CLIENT_ID": "your_id", "WHOOP_CLIENT_SECRET": "your_secret" }
//       }
//     }
//   }
// =============================================================================
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { WhoopClient, formatRecovery, formatSleep, formatWorkout, formatCycle, } from './whoop.js';
// ---- Validate env -----------------------------------------------------------
const clientId = process.env.WHOOP_CLIENT_ID;
const clientSecret = process.env.WHOOP_CLIENT_SECRET;
if (!clientId || !clientSecret) {
    process.stderr.write('[whoop-mcp] Error: WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET are required.\n' +
        '[whoop-mcp] Run: node dist/auth-setup.js to complete one-time setup.\n');
    process.exit(1);
}
const client = new WhoopClient({ clientId, clientSecret });
// ---- MCP Server -------------------------------------------------------------
const server = new McpServer({
    name: 'whoop',
    version: '1.0.0',
});
// Helper — wraps tool handlers with error handling
function safe(fn) {
    return fn()
        .then(text => ({ content: [{ type: 'text', text }] }))
        .catch(err => ({
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
    }));
}
// ---- Tools ------------------------------------------------------------------
// 1. Today's recovery
server.tool('get_recovery', "Get the user's most recent WHOOP recovery score, HRV, resting heart rate, and SpO2", {}, () => safe(async () => {
    const recovery = await client.getLatestRecovery();
    if (!recovery)
        return 'No recovery data available yet. Make sure your WHOOP is synced.';
    return formatRecovery(recovery);
}));
// 2. Last night's sleep
server.tool('get_sleep', "Get the user's most recent WHOOP sleep data including duration, sleep stages (light, deep/SWS, REM), efficiency, and respiratory rate", {}, () => safe(async () => {
    const sleep = await client.getLatestSleep();
    if (!sleep)
        return 'No sleep data available. Make sure your WHOOP is synced.';
    return formatSleep(sleep);
}));
// 3. Today's strain
server.tool('get_strain', "Get the user's current day strain score, average heart rate, and calories burned from WHOOP", {}, () => safe(async () => {
    const cycle = await client.getLatestCycle();
    if (!cycle)
        return 'No strain data available yet today.';
    return formatCycle(cycle);
}));
// 4. Latest workout
server.tool('get_latest_workout', "Get the user's most recent WHOOP workout — sport type, duration, strain, heart rate zones, and calories", {}, () => safe(async () => {
    const workout = await client.getLatestWorkout();
    if (!workout)
        return 'No recent workouts found.';
    return formatWorkout(workout);
}));
// 5. Recovery trend
server.tool('get_recovery_trend', "Get the user's WHOOP recovery scores over the past N days (default 7) for trend analysis", { days: z.number().min(1).max(25).default(7).describe('Number of days to look back (max 25)') }, ({ days }) => safe(async () => {
    const start = new Date();
    start.setDate(start.getDate() - days);
    const records = await client.getRecoveryCollection(start.toISOString(), undefined, days);
    if (records.length === 0)
        return 'No recovery data found for this period.';
    return records.map(formatRecovery).join('\n\n---\n\n');
}));
// 6. Sleep trend
server.tool('get_sleep_trend', "Get the user's WHOOP sleep data over the past N days (default 7) for trend analysis", { days: z.number().min(1).max(25).default(7).describe('Number of days to look back (max 25)') }, ({ days }) => safe(async () => {
    const start = new Date();
    start.setDate(start.getDate() - days);
    const records = await client.getSleepCollection(start.toISOString(), undefined, days);
    if (records.length === 0)
        return 'No sleep data found for this period.';
    // Filter to main sleeps only (exclude naps) unless there are none
    const mainSleeps = records.filter(s => !s.nap);
    const toShow = mainSleeps.length > 0 ? mainSleeps : records;
    return toShow.map(formatSleep).join('\n\n---\n\n');
}));
// 7. Workout history
server.tool('get_workout_history', "Get the user's recent WHOOP workout history — useful for understanding training load and patterns", { count: z.number().min(1).max(25).default(5).describe('Number of workouts to retrieve (max 25)') }, ({ count }) => safe(async () => {
    const workouts = await client.getWorkoutCollection(undefined, undefined, count);
    if (workouts.length === 0)
        return 'No workouts found.';
    return workouts.map(formatWorkout).join('\n\n---\n\n');
}));
// 8. User profile
server.tool('get_profile', "Get the user's WHOOP profile (name, email) and body measurements (height, weight, max heart rate)", {}, () => safe(async () => {
    const [profile, body] = await Promise.all([
        client.getProfile(),
        client.getBodyMeasurements(),
    ]);
    return [
        `Name: ${profile.first_name} ${profile.last_name}`,
        `Email: ${profile.email}`,
        `Height: ${(body.height_meter * 100).toFixed(0)} cm`,
        `Weight: ${body.weight_kilogram.toFixed(1)} kg`,
        `Max Heart Rate: ${body.max_heart_rate} bpm`,
    ].join('\n');
}));
// ---- Start ------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('[whoop-mcp] Server running\n');
//# sourceMappingURL=index.js.map