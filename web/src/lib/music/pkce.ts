// PKCE (Proof Key for Code Exchange) utilities for Spotify OAuth
// RFC 7636: https://tools.ietf.org/html/rfc7636

import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically random code_verifier.
 * Must be 43–128 characters, URL-safe.
 */
export function generateCodeVerifier(): string {
  // 32 random bytes → 43-char base64url string
  return randomBytes(32).toString("base64url");
}

/**
 * Derive code_challenge from code_verifier using S256 method.
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

/**
 * Build the Spotify authorization URL for PKCE flow.
 * Does NOT require client_secret.
 */
export function buildSpotifyPKCEAuthUrl({
  clientId,
  redirectUri,
  state,
  codeChallenge,
  scopes = ["user-top-read", "user-read-recently-played"],
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes?: string[];
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes.join(" "),
    redirect_uri: redirectUri,
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    show_dialog: "false",
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

/**
 * Exchange authorization code for tokens using PKCE.
 * Does NOT require client_secret.
 */
export async function exchangeCodePKCE({
  code,
  codeVerifier,
  clientId,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify PKCE token exchange failed (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Refresh access token using refresh_token.
 * PKCE refresh does NOT require client_secret — only client_id.
 */
export async function refreshAccessTokenPKCE({
  refreshToken,
  clientId,
}: {
  refreshToken: string;
  clientId: string;
}): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
}> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token refresh failed (${res.status}): ${err}`);
  }

  return res.json();
}
