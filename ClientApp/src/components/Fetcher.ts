import { TokenService } from "../common/services/TokenService";

interface RequestOptions extends RequestInit {
    headers?: HeadersInit;
}

/**
 * Get base API URL from window location
 */
function getBaseApiUrl(): string {
    const path = window.location.pathname;
    if (path.startsWith("/adminui")) {
        return "/adminui";
    }
    return "";
}

/**
 * Update request options with Authorization header
 */
async function updateOptions(options?: RequestOptions): Promise<RequestOptions> {
    const update: RequestOptions = { ...options };
    const accessToken = await TokenService.ensureValidToken(getBaseApiUrl());

    if (accessToken) {
        update.headers = {
            ...(update.headers || {}),
            Authorization: `Bearer ${accessToken}`,
        };
    }
    return update;
}

/**
 * Retry request with refreshed token after 401 response
 */
async function retryWithRefreshedToken(
    url: string,
    options: RequestOptions
): Promise<Response> {
    const baseApiUrl = getBaseApiUrl();
    const newToken = await TokenService.refreshAccessToken(baseApiUrl);

    if (!newToken) {
        // Refresh failed, need to logout
        TokenService.clearTokens();
        window.location.href = `${baseApiUrl}/account/logout`;
        return new Response("Token expired and refresh failed", { status: 401 });
    }

    // Retry with new token
    const retryOptions: RequestOptions = { ...options };
    retryOptions.headers = {
        ...(retryOptions.headers || {}),
        Authorization: `Bearer ${newToken}`,
    };

    return fetch(url, retryOptions);
}

/**
 * Enhanced fetcher with automatic token refresh on 401
 */
export default async function fetcher(url: string, options?: RequestOptions): Promise<Response> {
    const updatedOptions = await updateOptions(options);
    let response = await fetch(url, updatedOptions);

    // Sync localStorage if server returned new tokens via headers
    TokenService.saveTokensFromHeaders(response.headers);

    // Handle 401 Unauthorized - try to refresh token and retry
    if (response.status === 401) {
        console.warn("Received 401 Unauthorized, attempting token refresh...");
        response = await retryWithRefreshedToken(url, updatedOptions);
        
        // Also check retry response headers
        TokenService.saveTokensFromHeaders(response.headers);
    }

    return response;
}