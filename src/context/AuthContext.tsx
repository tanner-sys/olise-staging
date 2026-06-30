import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CaregiverProfile, ChildProfile } from '../types/database'

export type AuthContextValue = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: CaregiverProfile | null
  children: ChildProfile[]
  profileError: string | null
  childrenLoadError: string | null
  isEmailVerified: boolean
  hasConsent: boolean
  showSetupCta: boolean
  refreshProfile: () => Promise<void>
  refreshChildren: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export { AuthContext }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<CaregiverProfile | null>(null)
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([])
  const [profileError, setProfileError] = useState<string | null>(null)
  const [childrenLoadError, setChildrenLoadError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user) {
      setProfile(null)
      setProfileError(null)
      return
    }

    const { data, error } = await supabase
      .from('caregiver_profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to load caregiver profile', error)
      setProfileError(error.message)
      return
    }

    setProfile(data)
    setProfileError(null)
  }, [session])

  const refreshChildren = useCallback(async () => {
    if (!supabase || !session?.user) {
      setChildProfiles([])
      setChildrenLoadError(null)
      return
    }

    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('caregiver_id', session.user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load children', error)
      setChildrenLoadError(error.message)
      return
    }

    setChildProfiles(data ?? [])
    setChildrenLoadError(null)
  }, [session])

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setLoading(false))
      return
    }

    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      queueMicrotask(() => {
        setProfile(null)
        setChildProfiles([])
      })
      return
    }

    queueMicrotask(() => {
      void refreshProfile()
      void refreshChildren()
    })
  }, [session?.user, refreshProfile, refreshChildren])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
    setChildProfiles([])
  }, [])

  const isEmailVerified = Boolean(session?.user?.email_confirmed_at)
  const hasConsent = profile?.onboarding_status === 'consent_signed'
  const showSetupCta =
    hasConsent &&
    !profile?.setup_completed_at &&
    !profile?.setup_dismissed_at

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      children: childProfiles,
      profileError,
      childrenLoadError,
      isEmailVerified,
      hasConsent,
      showSetupCta,
      refreshProfile,
      refreshChildren,
      signOut,
    }),
    [
      loading,
      session,
      profile,
      childProfiles,
      profileError,
      childrenLoadError,
      isEmailVerified,
      hasConsent,
      showSetupCta,
      refreshProfile,
      refreshChildren,
      signOut,
    ],
  )

  if (!isSupabaseConfigured) {
    return (
      <AuthContext.Provider
        value={{
          loading: false,
          session: null,
          user: null,
          profile: null,
          children: [],
          profileError: null,
          childrenLoadError: null,
          isEmailVerified: false,
          hasConsent: false,
          showSetupCta: false,
          refreshProfile: async () => {},
          refreshChildren: async () => {},
          signOut: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
