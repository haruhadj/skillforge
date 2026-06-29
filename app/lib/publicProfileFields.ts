// Pure, dependency-free definition of what may appear in a publicProfiles/{uid}
// doc. Kept separate from publicProfileService (which imports the Firebase client
// SDK) so the security invariant below stays unit-testable without Firebase env.
// Must stay in sync with the hasOnly([...]) key allowlist in firestore.rules.

export const PUBLIC_PROFILE_FIELDS = [
  'username',
  'usernameNormalized',
  'photoURL',
  'photoThumbURL',
] as const

// Strip an arbitrary profile-ish object down to the allowlisted display fields,
// dropping undefined / non-string / empty values. The security invariant: even
// when handed a full UserProfile (email/role/device/linkedProviders), only the
// four display keys survive — PII can never reach publicProfiles.
export function pickPublicProfileFields(
  source: Partial<Record<string, unknown>>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of PUBLIC_PROFILE_FIELDS) {
    const value = source[key]
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value
    }
  }
  return out
}
