import crypto from 'crypto'

// Shared OAuth helpers used by the sign-in init routes and the account-linking flow.

export const OAUTH_STATE_COOKIE = 'oauth_state'
// When present on the callback, the OAuth flow is a "link to current account"
// operation rather than a fresh sign-in. Holds the verified uid being linked to.
export const OAUTH_LINK_UID_COOKIE = 'oauth_link_uid'
// Holds the PKCE code_verifier for providers that mandate PKCE (X / Twitter OAuth 2.0).
export const OAUTH_PKCE_COOKIE = 'oauth_pkce_verifier'

export type OAuthProvider = 'google' | 'github' | 'tiktok' | 'twitter' | 'facebook'

// Providers that require PKCE (RFC 7636). X (Twitter) OAuth 2.0 mandates it.
export function providerRequiresPkce(provider: OAuthProvider): boolean {
  return provider === 'twitter'
}

export function generateOAuthState(): string {
  return crypto.randomBytes(16).toString('hex')
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Generate a PKCE verifier + S256 challenge pair. The verifier is stashed in a
// cookie and replayed at the token-exchange step.
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(crypto.randomBytes(32))
  const challenge = base64UrlEncode(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function oauthRedirectUri(origin: string, provider: OAuthProvider): string {
  return `${origin}/api/auth/callback/${provider}`
}

export function oauthCookieOptions(maxAgeSeconds = 60 * 10) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeSeconds,
    path: '/',
  }
}

// Builds the provider authorization URL. Throws if the provider isn't configured
// so callers can surface a clear error instead of redirecting to a broken page.
export function buildAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string,
  // Required only for PKCE providers (X / Twitter); ignored otherwise.
  codeChallenge?: string,
): string {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    if (!clientId) throw new Error('Google OAuth not configured')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  if (provider === 'tiktok') {
    // TikTok uses `client_key` (not `client_id`) and never returns an email.
    const clientKey = process.env.TIKTOK_OAUTH_CLIENT_KEY
    if (!clientKey) throw new Error('TikTok OAuth not configured')
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user.info.basic',
      state,
    })
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`
  }

  if (provider === 'facebook') {
    const clientId = process.env.FACEBOOK_OAUTH_CLIENT_ID
    if (!clientId) throw new Error('Facebook OAuth not configured')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    })
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
  }

  if (provider === 'twitter') {
    // X (Twitter) OAuth 2.0 mandates PKCE and never returns an email.
    const clientId = process.env.TWITTER_OAUTH_CLIENT_ID
    if (!clientId) throw new Error('Twitter OAuth not configured')
    if (!codeChallenge) throw new Error('Twitter OAuth requires PKCE')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'users.read tweet.read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })
    return `https://x.com/i/oauth2/authorize?${params}`
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  if (!clientId) throw new Error('GitHub OAuth not configured')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  })
  return `https://github.com/login/oauth/authorize?${params}`
}
