import { OAuthConfig } from './auth.js';
export interface WhoopProfile {
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
}
export interface WhoopBodyMeasurements {
    height_meter: number;
    weight_kilogram: number;
    max_heart_rate: number;
}
export interface WhoopCycleScore {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
}
export interface WhoopCycle {
    id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    start: string;
    end: string | null;
    timezone_offset: string;
    score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
    score: WhoopCycleScore | null;
}
export interface WhoopRecoveryScore {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage: number | null;
    skin_temp_celsius: number | null;
}
export interface WhoopRecovery {
    cycle_id: number;
    sleep_id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
    score: WhoopRecoveryScore | null;
}
export interface WhoopSleepScore {
    stage_summary: {
        total_in_bed_time_milli: number;
        total_awake_time_milli: number;
        total_no_data_time_milli: number;
        total_light_sleep_time_milli: number;
        total_slow_wave_sleep_time_milli: number;
        total_rem_sleep_time_milli: number;
        sleep_cycle_count: number;
        disturbance_count: number;
    };
    sleep_needed: {
        baseline_milli: number;
        need_from_sleep_debt_milli: number;
        need_from_recent_strain_milli: number;
        need_from_recent_nap_milli: number;
    };
    respiratory_rate: number | null;
    sleep_performance_percentage: number | null;
    sleep_consistency_percentage: number | null;
    sleep_efficiency_percentage: number | null;
}
export interface WhoopSleep {
    id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    start: string;
    end: string;
    timezone_offset: string;
    nap: boolean;
    score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
    score: WhoopSleepScore | null;
}
export interface WhoopWorkoutScore {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded: number;
    distance_meter: number | null;
    altitude_gain_meter: number | null;
    altitude_change_meter: number | null;
    zone_duration: {
        zone_zero_milli: number | null;
        zone_one_milli: number | null;
        zone_two_milli: number | null;
        zone_three_milli: number | null;
        zone_four_milli: number | null;
        zone_five_milli: number | null;
    };
}
export interface WhoopWorkout {
    id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    start: string;
    end: string;
    timezone_offset: string;
    sport_id: number;
    score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
    score: WhoopWorkoutScore | null;
}
export interface PaginatedResponse<T> {
    records: T[];
    next_token: string | null;
}
export declare const SPORT_NAMES: Record<number, string>;
export declare class WhoopClient {
    private tokenManager;
    constructor(config: OAuthConfig);
    private request;
    getProfile(): Promise<WhoopProfile>;
    getBodyMeasurements(): Promise<WhoopBodyMeasurements>;
    getLatestRecovery(): Promise<WhoopRecovery | null>;
    getRecoveryCollection(start?: string, end?: string, limit?: number): Promise<WhoopRecovery[]>;
    getLatestSleep(): Promise<WhoopSleep | null>;
    getSleepCollection(start?: string, end?: string, limit?: number): Promise<WhoopSleep[]>;
    getLatestCycle(): Promise<WhoopCycle | null>;
    getCycleCollection(start?: string, end?: string, limit?: number): Promise<WhoopCycle[]>;
    getLatestWorkout(): Promise<WhoopWorkout | null>;
    getWorkoutCollection(start?: string, end?: string, limit?: number): Promise<WhoopWorkout[]>;
}
export declare function millisToHours(ms: number): string;
export declare function formatRecovery(r: WhoopRecovery): string;
export declare function formatSleep(s: WhoopSleep): string;
export declare function formatWorkout(w: WhoopWorkout): string;
export declare function formatCycle(c: WhoopCycle): string;
