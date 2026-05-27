// =============================================================================
// whoop.ts — WHOOP API client
//
// Wraps all WHOOP v2 REST API endpoints.
// Auth: OAuth2 with automatic token refresh via TokenManager
// Base URL: https://api.prod.whoop.com/developer
//
// API docs: https://developer.whoop.com/api
// =============================================================================
import { TokenManager } from './auth.js';
const BASE_URL = 'https://api.prod.whoop.com/developer';
// ---- Sport ID map -----------------------------------------------------------
export const SPORT_NAMES = {
    '-1': 'Activity',
    0: 'Running', 1: 'Cycling', 16: 'Baseball', 17: 'Basketball',
    18: 'Rowing', 19: 'Fencing', 20: 'Field Hockey', 21: 'Football',
    22: 'Golf', 24: 'Ice Hockey', 25: 'Lacrosse', 27: 'Rugby',
    28: 'Sailing', 29: 'Skiing', 30: 'Soccer', 31: 'Softball',
    32: 'Squash', 33: 'Swimming', 34: 'Tennis', 35: 'Track & Field',
    36: 'Volleyball', 37: 'Water Polo', 38: 'Wrestling', 39: 'Boxing',
    42: 'Dance', 43: 'Pilates', 44: 'Yoga', 45: 'Weightlifting',
    47: 'Cross Country Skiing', 48: 'Functional Fitness', 49: 'Duathlon',
    51: 'Gymnastics', 52: 'Hiking', 53: 'Horseback Riding', 55: 'Kayaking',
    56: 'Martial Arts', 57: 'Mountain Biking', 59: 'Obstacle Course Racing',
    60: 'Olympic Weightlifting', 61: 'Paddle Tennis', 62: 'Motorcycling',
    63: 'Powerlifting', 64: 'Rock Climbing', 65: 'Paddleboarding',
    66: 'Triathlon', 67: 'Walking', 68: 'Surfing', 69: 'Elliptical',
    70: 'Stairmaster', 71: 'Meditation', 73: 'Other', 74: 'Diving',
    75: 'Operations - Tactical', 76: 'Operations - Medical',
    77: 'Operations - Flying', 78: 'Operations - Water',
    82: 'Commuting', 83: 'Gaming', 84: 'Snowboarding', 85: 'Motocross',
    86: 'Caddying', 87: 'Obstacle Racing', 88: 'Motor Racing', 89: 'HIIT',
    90: 'Spin', 91: 'Jiu Jitsu', 92: 'Manual Labor', 93: 'Cricket',
    94: 'Pickleball', 95: 'Inline Skating', 96: 'Box Fitness', 97: 'Spikeball',
    98: 'Wheelchair Pushing', 99: 'Paddle Sports', 100: 'Barre',
    101: 'Stage Performance', 102: 'High Stress Work', 103: 'Ice Bath',
    104: 'Coaching', 105: 'Ice Skating', 106: 'Cross-training', 107: 'Parkour',
    108: 'Badminton', 109: 'Table Tennis', 110: 'Racquetball', 111: 'Jump Rope',
    112: 'Australian Football', 113: 'Skateboarding', 114: 'Coaching Sports',
    115: 'Sauna', 116: 'Disc Golf', 117: 'Ultimate Frisbee', 118: 'Snorkeling',
    119: 'Esports', 121: 'Pickleball',
};
// ---- API Client -------------------------------------------------------------
export class WhoopClient {
    tokenManager;
    constructor(config) {
        this.tokenManager = new TokenManager(config);
    }
    async request(path, params) {
        // Always get a fresh (auto-refreshed if needed) token
        const token = await this.tokenManager.getAccessToken();
        const url = new URL(`${BASE_URL}${path}`);
        if (params) {
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`WHOOP API error ${response.status}: ${body}`);
        }
        return response.json();
    }
    // User
    async getProfile() {
        return this.request('/v2/user/profile/basic');
    }
    async getBodyMeasurements() {
        return this.request('/v2/user/measurement/body');
    }
    // Recovery
    async getLatestRecovery() {
        const data = await this.request('/v2/recovery', { limit: '1' });
        return data.records[0] ?? null;
    }
    async getRecoveryCollection(start, end, limit = 7) {
        const params = { limit: String(limit) };
        if (start)
            params.start = start;
        if (end)
            params.end = end;
        const data = await this.request('/v2/recovery', params);
        return data.records;
    }
    // Sleep
    async getLatestSleep() {
        const data = await this.request('/v2/activity/sleep', { limit: '1' });
        const mainSleeps = data.records.filter(s => !s.nap);
        return mainSleeps[0] ?? data.records[0] ?? null;
    }
    async getSleepCollection(start, end, limit = 7) {
        const params = { limit: String(Math.min(limit, 25)) };
        if (start)
            params.start = start;
        if (end)
            params.end = end;
        const data = await this.request('/v2/activity/sleep', params);
        return data.records;
    }
    // Cycles
    async getLatestCycle() {
        const data = await this.request('/v2/cycle', { limit: '1' });
        return data.records[0] ?? null;
    }
    async getCycleCollection(start, end, limit = 7) {
        const params = { limit: String(Math.min(limit, 25)) };
        if (start)
            params.start = start;
        if (end)
            params.end = end;
        const data = await this.request('/v2/cycle', params);
        return data.records;
    }
    // Workouts
    async getLatestWorkout() {
        const data = await this.request('/v2/activity/workout', { limit: '1' });
        return data.records[0] ?? null;
    }
    async getWorkoutCollection(start, end, limit = 10) {
        const params = { limit: String(Math.min(limit, 25)) };
        if (start)
            params.start = start;
        if (end)
            params.end = end;
        const data = await this.request('/v2/activity/workout', params);
        return data.records;
    }
}
// ---- Formatting helpers -----------------------------------------------------
export function millisToHours(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
}
export function formatRecovery(r) {
    if (r.score_state !== 'SCORED' || !r.score) {
        return `Recovery for cycle ${r.cycle_id}: ${r.score_state}`;
    }
    const s = r.score;
    const zone = s.recovery_score >= 67 ? '🟢 Green' : s.recovery_score >= 34 ? '🟡 Yellow' : '🔴 Red';
    return [
        `Recovery Score: ${s.recovery_score}/100 (${zone})`,
        `HRV: ${s.hrv_rmssd_milli.toFixed(1)}ms`,
        `Resting Heart Rate: ${s.resting_heart_rate} bpm`,
        s.spo2_percentage ? `SpO2: ${s.spo2_percentage.toFixed(1)}%` : null,
        s.skin_temp_celsius ? `Skin Temp: ${s.skin_temp_celsius.toFixed(1)}°C` : null,
        `Date: ${new Date(r.created_at).toLocaleDateString()}`,
    ].filter(Boolean).join('\n');
}
export function formatSleep(s) {
    if (s.score_state !== 'SCORED' || !s.score) {
        return `Sleep on ${new Date(s.start).toLocaleDateString()}: ${s.score_state}`;
    }
    const sc = s.score;
    const ss = sc.stage_summary;
    return [
        `Sleep: ${new Date(s.start).toLocaleDateString()} (${s.nap ? 'Nap' : 'Main sleep'})`,
        `Performance: ${sc.sleep_performance_percentage?.toFixed(0) ?? 'N/A'}%`,
        `Efficiency: ${sc.sleep_efficiency_percentage?.toFixed(0) ?? 'N/A'}%`,
        `Total in bed: ${millisToHours(ss.total_in_bed_time_milli)}`,
        `Awake: ${millisToHours(ss.total_awake_time_milli)}`,
        `Light sleep: ${millisToHours(ss.total_light_sleep_time_milli)}`,
        `Deep sleep (SWS): ${millisToHours(ss.total_slow_wave_sleep_time_milli)}`,
        `REM sleep: ${millisToHours(ss.total_rem_sleep_time_milli)}`,
        `Disturbances: ${ss.disturbance_count}`,
        sc.respiratory_rate ? `Respiratory rate: ${sc.respiratory_rate.toFixed(1)} breaths/min` : null,
    ].filter(Boolean).join('\n');
}
export function formatWorkout(w) {
    const sportName = SPORT_NAMES[w.sport_id] ?? `Sport #${w.sport_id}`;
    if (w.score_state !== 'SCORED' || !w.score) {
        return `${sportName} on ${new Date(w.start).toLocaleDateString()}: ${w.score_state}`;
    }
    const s = w.score;
    const duration = (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000;
    return [
        `Workout: ${sportName}`,
        `Date: ${new Date(w.start).toLocaleDateString()}`,
        `Duration: ${Math.round(duration)} min`,
        `Strain: ${s.strain.toFixed(1)}/21`,
        `Avg HR: ${s.average_heart_rate} bpm`,
        `Max HR: ${s.max_heart_rate} bpm`,
        `Calories: ${(s.kilojoule / 4.184).toFixed(0)} kcal`,
        s.distance_meter ? `Distance: ${(s.distance_meter / 1000).toFixed(2)} km` : null,
    ].filter(Boolean).join('\n');
}
export function formatCycle(c) {
    if (c.score_state !== 'SCORED' || !c.score) {
        return `Cycle ${new Date(c.start).toLocaleDateString()}: ${c.score_state}`;
    }
    const s = c.score;
    return [
        `Day Strain: ${s.strain.toFixed(1)}/21`,
        `Avg HR: ${s.average_heart_rate} bpm`,
        `Max HR: ${s.max_heart_rate} bpm`,
        `Calories: ${(s.kilojoule / 4.184).toFixed(0)} kcal`,
        `Date: ${new Date(c.start).toLocaleDateString()}`,
    ].join('\n');
}
//# sourceMappingURL=whoop.js.map