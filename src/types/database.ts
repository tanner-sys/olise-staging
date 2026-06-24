export type OnboardingStatus =
  | 'registered'
  | 'email_verified'
  | 'mfa_enabled'
  | 'consent_signed'

export type CaregiverProfile = {
  id: string
  display_name: string
  role: string | null
  onboarding_status: OnboardingStatus
  active_child_id: string | null
  over_18_attested_at: string | null
  setup_dismissed_at: string | null
  setup_completed_at: string | null
  mfa_enrolled_at: string | null
  created_at: string
  updated_at: string
}

export type ChildProfile = {
  id: string
  caregiver_id: string
  display_name: string
  age_band: string
  conditions: string[]
  medications_notes: string | null
  care_team_notes: string | null
  is_placeholder: boolean
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type Database = {
  public: {
    Tables: {
      caregiver_profiles: {
        Row: CaregiverProfile
        Insert: {
          id: string
          display_name?: string
          role?: string | null
          onboarding_status?: OnboardingStatus
          active_child_id?: string | null
          over_18_attested_at?: string | null
          setup_dismissed_at?: string | null
          setup_completed_at?: string | null
          mfa_enrolled_at?: string | null
        }
        Update: {
          display_name?: string
          role?: string | null
          onboarding_status?: OnboardingStatus
          active_child_id?: string | null
          over_18_attested_at?: string | null
          setup_dismissed_at?: string | null
          setup_completed_at?: string | null
          mfa_enrolled_at?: string | null
        }
        Relationships: []
      }
      children: {
        Row: ChildProfile
        Insert: {
          caregiver_id: string
          display_name: string
          age_band: string
          conditions?: string[]
          medications_notes?: string | null
          care_team_notes?: string | null
          is_placeholder?: boolean
        }
        Update: {
          display_name?: string
          age_band?: string
          conditions?: string[]
          medications_notes?: string | null
          care_team_notes?: string | null
          is_placeholder?: boolean
          archived_at?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          id: string
          caregiver_id: string
          version: string
          accepted_at: string
          ip_address: string | null
        }
        Insert: {
          caregiver_id: string
          version: string
          ip_address?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      chat_sessions: {
        Row: {
          id: string
          caregiver_id: string
          child_id: string | null
          title: string
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          caregiver_id: string
          child_id?: string | null
          title?: string
          is_primary?: boolean
        }
        Update: {
          child_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          session_id: string
          caregiver_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          created_at: string
        }
        Insert: {
          session_id: string
          caregiver_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
        }
        Update: never
        Relationships: []
      }
      programs: {
        Row: {
          id: string
          title: string
          description: string
          duration: string | null
          tags: string[]
          steps: import('./program').ProgramStep[]
          version: number
          published_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      program_progress: {
        Row: {
          id: string
          caregiver_id: string
          child_id: string | null
          program_id: string
          step_index: number
          answers: Record<string, string>
          completed: boolean
          updated_at: string
        }
        Insert: {
          caregiver_id: string
          child_id?: string | null
          program_id: string
          step_index?: number
          answers?: Record<string, string>
          completed?: boolean
        }
        Update: {
          step_index?: number
          answers?: Record<string, string>
          completed?: boolean
        }
        Relationships: []
      }
      routines: {
        Row: {
          id: string
          title: string
          description: string
          frequency: string | null
          questions: import('./routine').RoutineQuestion[]
          version: number
          published_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      check_in_entries: {
        Row: {
          id: string
          child_id: string
          caregiver_id: string
          routine_id: string
          date: string
          answers: Record<string, number>
          section_scores: Record<string, number> | null
          composite_score: number | null
          completed_at: string
        }
        Insert: {
          child_id: string
          caregiver_id: string
          routine_id: string
          date: string
          answers?: Record<string, number>
          section_scores?: Record<string, number> | null
          composite_score?: number | null
          completed_at?: string
        }
        Update: {
          answers?: Record<string, number>
          section_scores?: Record<string, number> | null
          composite_score?: number | null
          completed_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_consent: {
        Args: { p_version: string; p_ip_address?: string | null }
        Returns: CaregiverProfile
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
