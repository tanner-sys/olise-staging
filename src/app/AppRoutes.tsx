import { useCallback, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { SettingsPage } from '../components/settings/SettingsPage'
import { ChatHome } from '../components/ChatHome'
import { ChatView } from '../components/chat/ChatView'
import { ProgramRunner } from '../components/ProgramRunner'
import { ProgramsWelcome } from '../components/ProgramsWelcome'
import { RoutineRunner } from '../components/RoutineRunner'
import { RoutinesWelcome } from '../components/RoutinesWelcome'
import { useAuth } from '../hooks/useAuth'
import { createPlaceholderChild, setActiveChild } from '../lib/children'
import { getProgramFromList } from '../lib/programs'
import { getRoutineFromList } from '../lib/routines'
import type { CheckInEntry, Routine } from '../types/routine'
import type { Program, ProgramProgress } from '../types/program'
import type { ChatSession } from '../hooks/useChatSessions'
import type { EnrolledItem } from '../utils/enrollment'
import { hapticSuccess } from '../platform'

type AppRoutesProps = {
  displayName?: string
  showSetupCta?: boolean
  enrolledProgram: EnrolledItem | null
  enrolledRoutine: EnrolledItem | null
  programProgress: Record<string, ProgramProgress>
  history: CheckInEntry[]
  onUpdateProgress: (programId: string, progress: ProgramProgress) => void
  onRoutineComplete: (entry: CheckInEntry, childId: string) => void
  onSelectProgram: (programId: string) => void
  onSelectRoutine: (routineId: string) => void
  onExplorePrograms: () => void
  onExploreRoutines: () => void
  onContinueProgram: () => void
  onContinueRoutine: () => void
  onStartChat: () => void
  onStartRoutine: () => void
  onStartSetup?: () => void
  onDismissSetup?: () => void
  onSendMessage?: (text: string) => void
  sendingMessage?: boolean
  sendError?: string | null
  onDismissSendError?: () => void
  onRetrySendMessage?: () => void
  onSessionActivity?: () => void
  chatSessions?: ChatSession[]
  chatScopeChildId?: string | null
  scopeChildName?: string | null
  onSelectChat?: (sessionId: string) => void
  programs: Program[]
  programsLoading: boolean
  programsError?: string | null
  onRefreshPrograms?: () => void
  routines: Routine[]
  routinesLoading: boolean
  routinesError?: string | null
  onRefreshRoutines?: () => void
}

function ProgramRoute({
  programs,
  programsLoading,
  programProgress,
  onUpdateProgress,
  onStartChat,
  onStartRoutine,
}: Pick<
  AppRoutesProps,
  | 'programs'
  | 'programsLoading'
  | 'programProgress'
  | 'onUpdateProgress'
  | 'onStartChat'
  | 'onStartRoutine'
>) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (programsLoading) {
    return <p className="chat-empty-hint">Loading program…</p>
  }

  const program = id ? getProgramFromList(programs, id) : undefined

  if (!program) {
    return <Navigate to="/programs" replace />
  }

  return (
    <ProgramRunner
      program={program}
      progress={programProgress[program.id] ?? { stepIndex: 0, answers: {}, completed: false }}
      onBack={() => navigate('/programs')}
      onUpdateProgress={(progress) => onUpdateProgress(program.id, progress)}
      onStartChat={onStartChat}
      onStartRoutine={onStartRoutine}
    />
  )
}

function RoutineRoute({
  routines,
  routinesLoading,
  history,
  onRoutineComplete,
}: Pick<AppRoutesProps, 'routines' | 'routinesLoading' | 'history' | 'onRoutineComplete'>) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile, children, refreshChildren, refreshProfile } = useAuth()
  const [childGateBusy, setChildGateBusy] = useState(false)
  const [pendingAutoStart, setPendingAutoStart] = useState(false)

  const handleSelectChild = useCallback(
    async (childId: string) => {
      if (!user) return
      await setActiveChild(user.id, childId)
      await refreshProfile()
    },
    [user, refreshProfile],
  )

  async function handleContinueWithoutNaming() {
    if (!user) return
    setChildGateBusy(true)
    try {
      await createPlaceholderChild(user.id)
      await refreshChildren()
      await refreshProfile()
      setPendingAutoStart(true)
    } finally {
      setChildGateBusy(false)
    }
  }

  function handleSetupProfile() {
    navigate('/onboarding/setup', { state: { returnTo: `/routines/${id}` } })
  }

  if (routinesLoading) {
    return <p className="chat-empty-hint">Loading routine…</p>
  }

  const routine = id ? getRoutineFromList(routines, id) : undefined

  if (!routine) {
    return <Navigate to="/routines" replace />
  }

  return (
    <RoutineRunner
      routine={routine}
      profile={profile}
      childProfiles={children}
      history={history}
      onBack={() => navigate('/routines')}
      onSetupProfile={handleSetupProfile}
      onContinueWithoutNaming={handleContinueWithoutNaming}
      onSelectChild={handleSelectChild}
      pendingAutoStart={pendingAutoStart}
      onAutoStartHandled={() => setPendingAutoStart(false)}
      childGateBusy={childGateBusy}
      onComplete={(entry, childId) => {
        onRoutineComplete(entry, childId)
        void hapticSuccess()
      }}
    />
  )
}

function ChatRoute({ onSessionActivity }: { onSessionActivity?: () => void }) {
  const { sessionId } = useParams<{ sessionId: string }>()

  if (!sessionId) {
    return <Navigate to="/" replace />
  }

  return <ChatView sessionId={sessionId} onSessionActivity={onSessionActivity} />
}

export function AppRoutes(props: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/settings" element={<SettingsPage />} />
      <Route
        path="/"
        element={
          <ChatHome
            displayName={props.displayName}
            showSetupCta={props.showSetupCta}
            enrolledProgram={props.enrolledProgram}
            enrolledRoutine={props.enrolledRoutine}
            onContinueProgram={props.onContinueProgram}
            onExplorePrograms={props.onExplorePrograms}
            onContinueRoutine={props.onContinueRoutine}
            onExploreRoutines={props.onExploreRoutines}
            onStartSetup={props.onStartSetup}
            onDismissSetup={props.onDismissSetup}
            onSendMessage={props.onSendMessage}
            sending={props.sendingMessage}
            sendError={props.sendError}
            onDismissSendError={props.onDismissSendError}
            onRetrySendMessage={props.onRetrySendMessage}
            chatSessions={props.chatSessions}
            chatScopeChildId={props.chatScopeChildId}
            scopeChildName={props.scopeChildName}
            onSelectChat={props.onSelectChat}
          />
        }
      />
      <Route
        path="/chat/:sessionId"
        element={<ChatRoute onSessionActivity={props.onSessionActivity} />}
      />
      <Route
        path="/programs"
        element={
          <ProgramsWelcome
            loading={props.programsLoading}
            error={props.programsError}
            isEmpty={!props.programsLoading && !props.programsError && props.programs.length === 0}
            onRetry={props.onRefreshPrograms}
          />
        }
      />
      <Route
        path="/programs/:id"
        element={
          <ProgramRoute
            programs={props.programs}
            programsLoading={props.programsLoading}
            programProgress={props.programProgress}
            onUpdateProgress={props.onUpdateProgress}
            onStartChat={props.onStartChat}
            onStartRoutine={props.onStartRoutine}
          />
        }
      />
      <Route
        path="/routines"
        element={
          <RoutinesWelcome
            loading={props.routinesLoading}
            error={props.routinesError}
            isEmpty={!props.routinesLoading && !props.routinesError && props.routines.length === 0}
            onRetry={props.onRefreshRoutines}
          />
        }
      />
      <Route
        path="/routines/:id"
        element={
          <RoutineRoute
            routines={props.routines}
            routinesLoading={props.routinesLoading}
            history={props.history}
            onRoutineComplete={props.onRoutineComplete}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
