import { supabase } from './supabase'

export type MfaEnrollment = {
  factorId: string
  qrCode: string
  secret: string
  uri: string
}

export type MfaFactorSummary = {
  id: string
  friendlyName: string
  status: 'verified' | 'unverified'
}

export async function listTotpFactors(): Promise<MfaFactorSummary[]> {
  if (!supabase) return []

  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error

  return (data?.totp ?? []).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? 'Authenticator app',
    status: factor.status === 'verified' ? 'verified' : 'unverified',
  }))
}

export async function clearUnverifiedTotpFactors(): Promise<void> {
  if (!supabase) return
  const client = supabase

  const factors = await listTotpFactors()
  await Promise.all(
    factors
      .filter((factor) => factor.status === 'unverified')
      .map(async (factor) => {
        const { error } = await client.auth.mfa.unenroll({ factorId: factor.id })
        if (error) throw error
      }),
  )
}

export async function startTotpEnrollment(): Promise<MfaEnrollment> {
  if (!supabase) throw new Error('Auth is not configured.')

  await clearUnverifiedTotpFactors()

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator app',
  })
  if (error) throw error
  if (!data?.id || !data.totp?.uri) {
    throw new Error('Could not start MFA enrollment.')
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code ?? '',
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

export async function verifyTotpEnrollment(factorId: string, code: string): Promise<void> {
  if (!supabase) throw new Error('Auth is not configured.')

  const trimmed = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('Enter the 6-digit code from your authenticator app.')
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })
  if (challengeError) throw challengeError
  if (!challenge?.id) throw new Error('Could not start MFA verification.')

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: trimmed,
  })
  if (verifyError) throw verifyError
}

export async function unenrollVerifiedTotp(): Promise<void> {
  if (!supabase) throw new Error('Auth is not configured.')

  const factors = await listTotpFactors()
  const verified = factors.find((factor) => factor.status === 'verified')
  if (!verified) return

  const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id })
  if (error) throw error
}

export async function markProfileMfaEnrolled(caregiverId: string, enrolled: boolean): Promise<void> {
  if (!supabase) throw new Error('Auth is not configured.')

  const { error } = await supabase
    .from('caregiver_profiles')
    .update({ mfa_enrolled_at: enrolled ? new Date().toISOString() : null })
    .eq('id', caregiverId)
  if (error) throw error
}
