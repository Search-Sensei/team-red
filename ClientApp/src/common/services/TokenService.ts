/**
 * TokenService: Manages access token and refresh token lifecycle
 * - Checks if token is expired
 * - Automatically refreshes token when expired
 * - Handles logout when refresh fails
 *
 * SilentRefreshThresholdSeconds is server-driven: it is returned by /api/token
 * and /api/auth/refresh as silent_refresh_threshold_seconds and persisted in
 * localStorage so that the configured value is respected across page reloads
 * without an additional network round-trip.
 */

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function buildRefreshEndpoints(baseApiUrl: string): string[] {
    const normalizedBase = (baseApiUrl || "").replace(/\/$/, "");
    const candidates = [
        `${normalizedBase}/api/auth/refresh`,
        "/api/auth/refresh",
        "/adminui/api/auth/refresh"
    ];

    return Array.from(new Set(candidates.filter((url) => url.length > 0)));
}

function onRefreshed(token: string) {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
}

export const TokenService = {
    /**
     * Get current access token from localStorage
     */
    getAccessToken(): string | null {
        return localStorage.getItem("accessToken");
    },

    /**
     * Get refresh token from localStorage
     */
    getRefreshToken(): string | null {
        return localStorage.getItem("refreshToken");
    },

    /**
     * Get token expiry timestamp
     */
    getTokenTimestamp(): number {
        const timestamp = localStorage.getItem("timestamp");
        return timestamp ? parseInt(timestamp, 10) : 0;
    },

    /**
     * Get the server-configured silent refresh threshold in seconds.
     * Falls back to 60 seconds when the value has not yet been received from the server.
     */
    getSilentRefreshThresholdSeconds(): number {
        const stored = localStorage.getItem("silent_refresh_threshold_seconds");
        if (stored !== null) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 60;
    },

    /**
     * Check if the token is within the silent-refresh window.
     * Returns true (i.e. "expired" from the client's perspective) when the
     * remaining token lifetime is less than SilentRefreshThresholdSeconds.
     *
     * @param bufferSeconds Override the server-configured threshold. Useful in
     *   tests. When omitted the stored silent_refresh_threshold_seconds is used.
     */
    isTokenExpired(bufferSeconds?: number): boolean {
        const threshold = bufferSeconds !== undefined
            ? bufferSeconds
            : this.getSilentRefreshThresholdSeconds();
        const timestamp = this.getTokenTimestamp();
        const now = Date.now();
        const expiryTime = timestamp - threshold * 1000;
        return now >= expiryTime;
    },

    /**
     * Save token response to localStorage
     */
    saveTokenResponse(response: Record<string, any>): void {
        if (response.access_token) {
            localStorage.setItem("accessToken", response.access_token);
        }
        if (response.refresh_token) {
            localStorage.setItem("refreshToken", response.refresh_token);
        }
        if (response.expires_in) {
            const expiresIn = parseInt(response.expires_in, 10);
            localStorage.setItem("timestamp", (Date.now() + expiresIn * 1000).toString());
        }
        if (response.token_type) {
            localStorage.setItem("token_type", response.token_type);
        }
        if (response.refresh_expires_in) {
            localStorage.setItem("refresh_expires_in", response.refresh_expires_in.toString());
        }
        if (response.session_state) {
            localStorage.setItem("session_state", response.session_state);
        }
        if (response.scope) {
            localStorage.setItem("scope", response.scope);
        }
        if (response.not_before_policy) {
            localStorage.setItem("not_before_policy", response.not_before_policy.toString());
        }
        // Persist the server-configured silent refresh threshold so that it
        // survives page reloads without needing a fresh /api/token call.
        if (response.silent_refresh_threshold_seconds !== undefined) {
            localStorage.setItem(
                "silent_refresh_threshold_seconds",
                response.silent_refresh_threshold_seconds.toString()
            );
        }
    },

    /**
     * Clear all token data from localStorage
     */
    clearTokens(): void {
        const tokenKeys = [
            "accessToken",
            "refreshToken",
            "timestamp",
            "token_type",
            "expires_in",
            "refresh_expires_in",
            "session_state",
            "scope",
            "not_before_policy",
            "silent_refresh_threshold_seconds"
        ];
        tokenKeys.forEach((key) => localStorage.removeItem(key));
    },

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(baseApiUrl: string): Promise<string | null> {
        // Prevent multiple simultaneous refresh requests
        if (isRefreshing) {
            return new Promise((resolve) => {
                addRefreshSubscriber((token: string) => {
                    resolve(token);
                });
            });
        }

        isRefreshing = true;
        console.warn("Token expired, attempting to refresh...");
        try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
                console.warn("No refresh token available");
                this.clearTokens();
                return null;
            }

            const refreshEndpoints = buildRefreshEndpoints(baseApiUrl);
            let response: Response | null = null;

            for (const endpoint of refreshEndpoints) {
                response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                if (response.status !== 404) {
                    break;
                }
            }

            if (!response) {
                console.error("Token refresh failed: no refresh endpoint available.");
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (response.status === 401 || errorData.error === "refresh_token_expired") {
                    console.error("Refresh token expired or invalid. Clearing session.");
                    this.clearTokens();
                    return null;
                }

                console.error("Token refresh failed with status:", response.status);
                return null;
            }

            const tokenData = await response.json();
            this.saveTokenResponse(tokenData);

            const newToken = tokenData.access_token;
            console.log("Tokens refreshed successfully.");

            onRefreshed(newToken);
            return newToken;
        } catch (error) {
            console.error("Unexpected error during token refresh:", error);
            return null;
        } finally {
            isRefreshing = false;
        }
    },

    /**
     * Ensure token is valid, refresh if expired
     */
    async ensureValidToken(baseApiUrl: string): Promise<string | null> {
        const accessToken = this.getAccessToken();

        // No token
        if (!accessToken) {
            return null;
        }

        // Token not expired
        if (!this.isTokenExpired()) {
            return accessToken;
        }

        // Token expired, try to refresh
        const refreshedToken = await this.refreshAccessToken(baseApiUrl);
        return refreshedToken;
    },

    /**
     * Save tokens from response headers (used during transparent refresh)
     */
    saveTokensFromHeaders(headers: Headers): void {
        const accessToken = headers.get("X-Access-Token");
        if (!accessToken) return;

        console.log("New access token detected in response headers. Syncing localStorage...");

        const data: Record<string, any> = {
            access_token: accessToken,
            refresh_token: headers.get("X-Refresh-Token"),
            id_token: headers.get("X-Id-Token"),
            expires_in: headers.get("X-Expires-In"),
            refresh_expires_in: headers.get("X-Refresh-Expires-In"),
            session_state: headers.get("X-Session-State"),
            scope: headers.get("X-Scope"),
            not_before_policy: headers.get("X-Not-Before-Policy"),
            silent_refresh_threshold_seconds: headers.get("X-Silent-Refresh-Threshold-Seconds")
        };

        this.saveTokenResponse(data);
    }
};
