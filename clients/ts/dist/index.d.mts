interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
    role: string;
    created_at: string;
    updated_at: string;
    mfa_enabled: boolean;
    profile_image?: string;
}
interface Session {
    access_token: string;
    refresh_token?: string;
    user?: User;
}
interface AuthClientConfig {
    /** The base URL of your auth server (e.g. https://auth.example.com) */
    serverUrl: string;
    /** Your OAuth client ID, obtained from the /oauth/clients API */
    clientId: string;
    /**
     * Where to persist the session tokens.
     * - `'localStorage'` – survives tab close (browser only)
     * - `'sessionStorage'` – cleared on tab close (browser only)
     * - `'memory'` – no persistence, lost on page reload (default, SSR-safe)
     */
    storage?: 'localStorage' | 'sessionStorage' | 'memory';
    /** Custom storage key. Defaults to `auth_session_<clientId>` */
    storageKey?: string;
}
interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    error?: {
        message?: string;
        code?: string;
    };
}
interface SessionInfo {
    id: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    expires_at: string;
    is_current: boolean;
}
interface AuditLog {
    id: string;
    action: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
}
type AuthStateChangeCallback = (session: Session | null) => void;

declare class AuthError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number);
}
declare class AuthClient {
    private serverUrl;
    private clientId;
    private accessToken;
    private refreshToken;
    private storageType;
    private storageKey;
    private listeners;
    private isRefreshing;
    private refreshPromise;
    constructor(config: AuthClientConfig);
    private getStorage;
    private loadSession;
    private saveSession;
    private clearSession;
    /**
     * Subscribe to auth state changes. The callback fires immediately
     * with the current state, then again whenever the session changes.
     * Returns an unsubscribe function.
     */
    onAuthStateChanged(callback: AuthStateChangeCallback): () => void;
    private notifyListeners;
    /** Returns the current access token, or null if not authenticated */
    getAccessToken(): string | null;
    /** Returns the current refresh token, or null */
    getRefreshToken(): string | null;
    /** Returns true if the client currently has a valid session */
    isAuthenticated(): boolean;
    /** Manually set the session (e.g. from OAuth callback URL params) */
    setSession(session: Session): void;
    private fetchApi;
    /** Register a new user */
    register(email: string, password: string, firstName: string, lastName: string): Promise<ApiResponse<User>>;
    /** Login with email and password. Automatically persists the session. */
    login(email: string, password: string): Promise<Session>;
    /** Refresh the access token using the stored refresh token. */
    refresh(): Promise<Session>;
    /** Logout the current session. Clears tokens even if the API call fails. */
    logout(): Promise<void>;
    /** Logout from all devices */
    logoutAll(): Promise<void>;
    /**
     * Initiates Google OAuth login by redirecting the browser.
     * This method only works in browser environments.
     */
    loginWithGoogle(): void;
    /**
     * Initiates GitHub OAuth login by redirecting the browser.
     * This method only works in browser environments.
     */
    loginWithGitHub(): void;
    /** Get the authenticated user's profile */
    getUser(): Promise<User>;
    /** Update the user's profile */
    updateProfile(firstName?: string, lastName?: string): Promise<User>;
    /** Change the user's password */
    changePassword(currentPassword: string, newPassword: string): Promise<void>;
    /** Delete the user's account */
    deleteAccount(): Promise<void>;
    /** Verify email with a token */
    verifyEmail(token: string): Promise<void>;
    /** Resend verification email */
    resendVerification(email: string): Promise<void>;
    /** Send a password reset email */
    forgotPassword(email: string): Promise<void>;
    /** Reset password using a token */
    resetPassword(token: string, password: string): Promise<void>;
    /** Enable MFA. Returns the TOTP secret and QR code data. */
    enableMfa(): Promise<{
        secret: string;
        qr_code: string;
    }>;
    /** Verify MFA with a TOTP code (completes MFA setup) */
    verifyMfa(code: string): Promise<void>;
    /** Login with MFA code (second factor after email/password) */
    loginMfa(email: string, code: string): Promise<Session>;
    /** Get all active sessions for the user */
    getSessions(): Promise<SessionInfo[]>;
    /** Revoke a specific session by ID */
    revokeSession(sessionId: string): Promise<void>;
    /** Get audit logs for the user */
    getAuditLogs(): Promise<AuditLog[]>;
}

export { type ApiResponse, type AuditLog, AuthClient, type AuthClientConfig, AuthError, type AuthStateChangeCallback, type Session, type SessionInfo, type User };
