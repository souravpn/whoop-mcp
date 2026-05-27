export interface TokenStore {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}
export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
}
export declare function loadTokens(): TokenStore;
export declare function saveTokens(tokens: TokenStore): void;
export declare function isExpired(tokens: TokenStore): boolean;
export declare function refreshTokens(tokens: TokenStore, config: OAuthConfig): Promise<TokenStore>;
export declare class TokenManager {
    private tokens;
    private config;
    constructor(config: OAuthConfig);
    getAccessToken(): Promise<string>;
}
