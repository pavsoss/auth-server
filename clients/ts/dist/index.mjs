// src/AuthClient.ts
var AuthError = class extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
};
var AuthClient = class {
  serverUrl;
  clientId;
  accessToken = null;
  refreshToken = null;
  storageType;
  storageKey;
  listeners = /* @__PURE__ */ new Set();
  isRefreshing = false;
  refreshPromise = null;
  constructor(config) {
    if (!config.serverUrl) throw new Error("serverUrl is required");
    if (!config.clientId) throw new Error("clientId is required");
    this.serverUrl = config.serverUrl.replace(/\/$/, "");
    this.clientId = config.clientId;
    this.storageType = config.storage || "memory";
    this.storageKey = config.storageKey || `auth_session_${this.clientId}`;
    this.loadSession();
  }
  // --- Storage & Events ---
  getStorage() {
    if (this.storageType === "memory" || typeof window === "undefined") return null;
    return this.storageType === "localStorage" ? window.localStorage : window.sessionStorage;
  }
  loadSession() {
    const storage = this.getStorage();
    if (!storage) return;
    const stored = storage.getItem(this.storageKey);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        this.accessToken = session.access_token;
        if (session.refresh_token) {
          this.refreshToken = session.refresh_token;
        }
      } catch {
        storage.removeItem(this.storageKey);
      }
    }
  }
  saveSession(session) {
    this.accessToken = session.access_token;
    if (session.refresh_token) {
      this.refreshToken = session.refresh_token;
    }
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(this.storageKey, JSON.stringify({
        access_token: this.accessToken,
        refresh_token: this.refreshToken
      }));
    }
    this.notifyListeners({
      access_token: this.accessToken,
      refresh_token: this.refreshToken || void 0,
      user: session.user
    });
  }
  clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(this.storageKey);
    }
    this.notifyListeners(null);
  }
  /**
   * Subscribe to auth state changes. The callback fires immediately
   * with the current state, then again whenever the session changes.
   * Returns an unsubscribe function.
   */
  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    if (this.accessToken) {
      callback({ access_token: this.accessToken, refresh_token: this.refreshToken || void 0 });
    } else {
      callback(null);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }
  notifyListeners(session) {
    this.listeners.forEach((listener) => {
      try {
        listener(session);
      } catch {
      }
    });
  }
  /** Returns the current access token, or null if not authenticated */
  getAccessToken() {
    return this.accessToken;
  }
  /** Returns the current refresh token, or null */
  getRefreshToken() {
    return this.refreshToken;
  }
  /** Returns true if the client currently has a valid session */
  isAuthenticated() {
    return this.accessToken !== null;
  }
  /** Manually set the session (e.g. from OAuth callback URL params) */
  setSession(session) {
    this.saveSession(session);
  }
  // --- Interceptor & Fetch Logic ---
  async fetchApi(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }
    let response;
    try {
      response = await fetch(`${this.serverUrl}${path}`, { ...options, headers });
    } catch (err) {
      throw new AuthError(
        "Network error: unable to reach the auth server",
        "NETWORK_ERROR",
        0
      );
    }
    if (response.status === 401 && this.refreshToken && path !== "/api/auth/refresh") {
      try {
        await this.refresh();
        headers.set("Authorization", `Bearer ${this.accessToken}`);
        response = await fetch(`${this.serverUrl}${path}`, { ...options, headers });
      } catch {
        this.clearSession();
        throw new AuthError("Session expired. Please log in again.", "SESSION_EXPIRED", 401);
      }
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AuthError(
        data.error?.message || data.message || `Request failed with status ${response.status}`,
        data.error?.code || "API_ERROR",
        response.status
      );
    }
    return data;
  }
  // --- Core Auth ---
  /** Register a new user */
  async register(email, password, firstName, lastName) {
    return this.fetchApi("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName })
    });
  }
  /** Login with email and password. Automatically persists the session. */
  async login(email, password) {
    const data = await this.fetchApi("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.saveSession(data.data);
    return data.data;
  }
  /** Refresh the access token using the stored refresh token. */
  async refresh() {
    if (!this.refreshToken) {
      throw new AuthError("No refresh token available", "NO_REFRESH_TOKEN", 401);
    }
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }
    this.isRefreshing = true;
    this.refreshPromise = this.fetchApi("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: this.refreshToken })
    }).then((res) => {
      this.saveSession(res.data);
      return res.data;
    }).catch((err) => {
      this.clearSession();
      throw err;
    }).finally(() => {
      this.isRefreshing = false;
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }
  /** Logout the current session. Clears tokens even if the API call fails. */
  async logout() {
    try {
      if (this.refreshToken) {
        await this.fetchApi("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: this.refreshToken })
        });
      }
    } catch {
    }
    this.clearSession();
  }
  /** Logout from all devices */
  async logoutAll() {
    await this.fetchApi("/api/auth/logout-all", { method: "POST" });
    this.clearSession();
  }
  // --- OAuth ---
  /**
   * Initiates Google OAuth login by redirecting the browser.
   * This method only works in browser environments.
   */
  loginWithGoogle() {
    if (typeof window === "undefined") {
      throw new AuthError("loginWithGoogle() can only be used in a browser", "BROWSER_ONLY", 0);
    }
    window.location.href = `${this.serverUrl}/api/auth/google/login?client_id=${encodeURIComponent(this.clientId)}`;
  }
  /**
   * Initiates GitHub OAuth login by redirecting the browser.
   * This method only works in browser environments.
   */
  loginWithGitHub() {
    if (typeof window === "undefined") {
      throw new AuthError("loginWithGitHub() can only be used in a browser", "BROWSER_ONLY", 0);
    }
    window.location.href = `${this.serverUrl}/api/auth/github/login?client_id=${encodeURIComponent(this.clientId)}`;
  }
  // --- User Profile & Account ---
  /** Get the authenticated user's profile */
  async getUser() {
    const data = await this.fetchApi("/api/auth/me", { method: "GET" });
    return data.data;
  }
  /** Update the user's profile */
  async updateProfile(firstName, lastName) {
    const data = await this.fetchApi("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ first_name: firstName, last_name: lastName })
    });
    return data.data;
  }
  /** Change the user's password */
  async changePassword(currentPassword, newPassword) {
    await this.fetchApi("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
  }
  /** Delete the user's account */
  async deleteAccount() {
    await this.fetchApi("/api/auth/me", { method: "DELETE" });
    this.clearSession();
  }
  // --- Verification & Reset ---
  /** Verify email with a token */
  async verifyEmail(token) {
    await this.fetchApi(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { method: "GET" });
  }
  /** Resend verification email */
  async resendVerification(email) {
    await this.fetchApi("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  }
  /** Send a password reset email */
  async forgotPassword(email) {
    await this.fetchApi("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  }
  /** Reset password using a token */
  async resetPassword(token, password) {
    await this.fetchApi("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password })
    });
  }
  // --- MFA ---
  /** Enable MFA. Returns the TOTP secret and QR code data. */
  async enableMfa() {
    const data = await this.fetchApi("/api/auth/mfa/enable", { method: "POST" });
    return data.data;
  }
  /** Verify MFA with a TOTP code (completes MFA setup) */
  async verifyMfa(code) {
    await this.fetchApi("/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code })
    });
  }
  /** Login with MFA code (second factor after email/password) */
  async loginMfa(email, code) {
    const data = await this.fetchApi("/api/auth/login/mfa", {
      method: "POST",
      body: JSON.stringify({ email, code })
    });
    this.saveSession(data.data);
    return data.data;
  }
  // --- Sessions & Logs ---
  /** Get all active sessions for the user */
  async getSessions() {
    const data = await this.fetchApi("/api/auth/sessions", { method: "GET" });
    return data.data;
  }
  /** Revoke a specific session by ID */
  async revokeSession(sessionId) {
    await this.fetchApi(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  }
  /** Get audit logs for the user */
  async getAuditLogs() {
    const data = await this.fetchApi("/api/auth/audit-logs", { method: "GET" });
    return data.data;
  }
};
export {
  AuthClient,
  AuthError
};
