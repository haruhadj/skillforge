import crypto from 'crypto'

// Shared OAuth helpers used by the sign-in init routes and the account-linking flow.

export const OAUTH_STATE_COOKIE = 'oauth_state'
// When present on the callback, the OAuth flow is a "link to current account"
// operation rather than a fresh sign-in. Holds the verified uid being linked to.
export const OAUTH_LINK_UID_COOKIE = 'oauth_link_uid'

export type OAuthProvider = 'google' | 'github'

export function generateOAuthState(): string {
  return crypto.randomBytes(16).toString('hex')
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
