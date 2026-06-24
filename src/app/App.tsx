import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { ShellChrome } from '../components/ShellChrome'
import { useAuth } from '../context/AuthContext'
import { useChatSessions } from '../hooks/useChatSessions'
import { usePrograms } from '../hooks/usePrograms'
import { useRoutines } from '../hooks/useRoutines'
import { useProgramProgress } from '../hooks/useProgramProgress'
import { useRoutineHistory } from '../hooks/useRoutineHistory'
import { activeChildren, displayChildName, resolveCheckInChildId, setActiveChild } from '../lib/children'
import { filterChatSessionsByScope } from '../lib/chatSessions'
import { supabase } from '../lib/supabase'
import type { SidebarTab } from '../types/program'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useSidebarWidth } from '../hooks/useSidebarWidth'
import { SidebarResizeHandle } from '../components/SidebarResizeHandle'
import { configureShell, getShellClassName, isMobile } from '../platform'
import { isEditableTarget } from '../lib/keyboard'
import { getEnrolledProgram, getEnrolledRoutine } from '../utils/enrollment'
import { AppRoutes } from './AppRoutes'
import { ChatProjectControl } from '../components/chat/ChatProjectControl'
import { ChatProjectLabel } from '../components/chat/ChatProjectLabel'
import { updateSessionChildId } from '../lib/chatStorage'
import '../App.css'
import '../components/ShellChrome.css'
import '../styles/desktop-polish.css'

function tabFromPath(pathname: string): SidebarTab {
  if (pathname.startsWith('/programs')) return 'programs'
  if (pathname.startsWith('/routines')) return 'routines'
  return 'chat'
}

function programIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/programs\/([^/]+)/)
  return match?.[1] ?? null
}

function routineIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/routines\/([^/]+)/)
  return match?.[1] ?? null
}

function chatSessionIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)/)
  return match?.[1] ?? null
}

const SIDEBAR_PINNED_KEY = 'olise-sidebar-pinned'

function readSidebarPinned(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(SIDEBAR_PINNED_KEY)
  if (stored === 'false') return false
  if (stored === 'true') return true
  return window.matchMedia('(min-width: 768px)').matches
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const isWide = useMediaQuery('(min-width: 768px)')
  const { startResize, resizing: sidebarResizing } = useSidebarWidth(isWide)
  const { profile, children, showSetupCta, refreshProfile, user } = useAuth()
  const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned)
  const [sidebarOverlayOpen, setSidebarOverlayOpen] = useState(false)
  const [sidebarPeek, setSidebarPeek] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [failedMessageText, setFailedMessageText] = useState<string | null>(null)
  const [chatScopeChildId, setChatScopeChildId] = useState<string | null>(null)
  const [sessionChildBusy, setSessionChildBusy] = useState(false)

  const { history, addEntry, isRoutineDueToday } = useRoutineHistory()
  const { programProgress, ensureProgram, updateProgress } = useProgramProgress()
  const { sessions: chatSessions, refresh: refreshChatSessions, createSession } = useChatSessions()
  const { programs, loading: programsLoading, error: programsError, refresh: refreshPrograms } = usePrograms()
  const { routines, loading: routinesLoading, error: routinesError, refresh: refreshRoutines } = useRoutines()

  const activeTab = tabFromPath(location.pathname)
  const activeProgramId = programIdFromPath(location.pathname)
  const activeRoutineId = routineIdFromPath(location.pathname)
  const activeChatSessionId = chatSessionIdFromPath(location.pathname)
  const isSettingsActive = location.pathname.startsWith('/settings')
  const isRunnerActive = Boolean(activeProgramId || activeRoutineId)
  const isChatActive = Boolean(activeChatSessionId)

  const chatChildList = useMemo(() => activeChildren(children), [children])
  const namedChatChildren = useMemo(
    () => chatChildList.filter((child) => !child.is_placeholder),
    [chatChildList],
  )
  const showChatChildProjects = namedChatChildren.length >= 1

  const scopedChatSessions = useMemo(
    () =>
      filterChatSessionsByScope(chatSessions, {
        showChatChildProjects,
        chatScopeChildId,
      }),
    [chatSessions, showChatChildProjects, chatScopeChildId],
  )

  const activeChatSession = useMemo(
    () => chatSessions.find((session) => session.id === activeChatSessionId) ?? null,
    [chatSessions, activeChatSessionId],
  )

  const chatScopeChildName = useMemo(() => {
    if (!chatScopeChildId) return null
    const child = chatChildList.find((entry) => entry.id === chatScopeChildId)
    return child ? displayChildName(child) : null
  }, [chatScopeChildId, chatChildList])

  const dismissSidebarPeek = useCallback(() => {
    setSidebarPeek(false)
  }, [])

  const closeSidebarIfMobile = useCallback(() => {
    if (!isWide) setSidebarOverlayOpen(false)
  }, [isWide])

  const handleToggleSidebar = useCallback(() => {
    if (isWide) {
      setSidebarPinned((pinned) => {
        const next = !pinned
        localStorage.setItem(SIDEBAR_PINNED_KEY, String(next))
        return next
      })
      setSidebarPeek(false)
      return
    }
    setSidebarOverlayOpen((open) => !open)
  }, [isWide])

  useEffect(() => {
    if (!activeChatSessionId) return
    const session = chatSessions.find((s) => s.id === activeChatSessionId)
    if (session) setChatScopeChildId(session.child_id)
  }, [activeChatSessionId, chatSessions])

  useEffect(() => {
    void configureShell()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      if (event.key === 'Escape') {
        if (isWide) {
          setSidebarPeek(false)
        } else if (sidebarOverlayOpen) {
          setSidebarOverlayOpen(false)
        }
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault()
        handleToggleSidebar()
        return
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const onChat =
          location.pathname === '/' || location.pathname.startsWith('/chat/')
        if (!onChat) return
        event.preventDefault()
        document.querySelector<HTMLTextAreaElement>('[data-composer-input]')?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleSidebar, isWide, location.pathname, sidebarOverlayOpen])

  useEffect(() => {
    if (!isMobile()) return

    let removeListener: (() => void) | undefined

    void import('@capacitor/app').then(({ App: CapApp }) => {
      void CapApp.addListener('backButton', () => {
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          void CapApp.exitApp()
        }
      }).then((handle) => {
        removeListener = () => void handle.remove()
      })
    })

    return () => removeListener?.()
  }, [navigate])

  const routineDueToday = useMemo(() => {
    const due: Record<string, boolean> = {}
    for (const routine of routines) {
      due[routine.id] = isRoutineDueToday(routine.id)
    }
    return due
  }, [routines, isRoutineDueToday])

  const enrolledProgram = useMemo(
    () => getEnrolledProgram(programProgress, programs),
    [programProgress, programs],
  )

  const enrolledRoutine = useMemo(
    () => getEnrolledRoutine(history, routines),
    [history, routines],
  )

  const handleSelectProgram = useCallback(
    (programId: string) => {
      ensureProgram(programId)
      navigate(`/programs/${programId}`)
      closeSidebarIfMobile()
    },
    [ensureProgram, navigate, closeSidebarIfMobile],
  )

  const handleSelectRoutine = useCallback(
    (routineId: string) => {
      navigate(`/routines/${routineId}`)
      closeSidebarIfMobile()
    },
    [navigate, closeSidebarIfMobile],
  )

  const handleExplorePrograms = useCallback(() => {
    navigate('/programs')
    closeSidebarIfMobile()
  }, [navigate, closeSidebarIfMobile])

  const handleExploreRoutines = useCallback(() => {
    navigate('/routines')
    closeSidebarIfMobile()
  }, [navigate, closeSidebarIfMobile])

  const handleContinueProgram = useCallback(() => {
    if (!enrolledProgram) return
    handleSelectProgram(enrolledProgram.id)
  }, [enrolledProgram, handleSelectProgram])

  const handleContinueRoutine = useCallback(() => {
    if (!enrolledRoutine) return
    handleSelectRoutine(enrolledRoutine.id)
  }, [enrolledRoutine, handleSelectRoutine])

  const handleStartChat = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleStartRoutine = useCallback(() => {
    const routineId = routines[0]?.id ?? 'daily-check-in'
    navigate(`/routines/${routineId}`)
  }, [navigate, routines])

  const handleTabChange = useCallback(
    (tab: SidebarTab) => {
      if (tab === 'chat') {
        setChatScopeChildId(null)
        navigate('/')
      } else if (tab === 'programs') navigate('/programs')
      else navigate('/routines')
    },
    [navigate],
  )

  const handleStartSetup = useCallback(() => {
    navigate('/onboarding/setup')
  }, [navigate])

  const handleDismissSetup = useCallback(async () => {
    if (!supabase || !profile) return
    await supabase
      .from('caregiver_profiles')
      .update({ setup_dismissed_at: new Date().toISOString() })
      .eq('id', profile.id)
    await refreshProfile()
  }, [profile, refreshProfile])

  const resolveNewChatChildId = useCallback((): string | null => {
    if (showChatChildProjects) return chatScopeChildId
    return resolveCheckInChildId(profile, children) ?? profile?.active_child_id ?? null
  }, [showChatChildProjects, chatScopeChildId, profile, children])

  const handleSendMessage = useCallback(
    async (text: string) => {
      setSendingMessage(true)
      setSendError(null)
      setFailedMessageText(text)
      try {
        const chatSession = await createSession(resolveNewChatChildId())
        navigate(`/chat/${chatSession.id}`, { state: { initialMessage: text } })
        setFailedMessageText(null)
      } catch (err) {
        console.error('Failed to start chat', err)
        setSendError(
          err instanceof Error
            ? err.message
            : 'Could not start a new chat. Check your connection and try again.',
        )
      } finally {
        setSendingMessage(false)
      }
    },
    [createSession, navigate, resolveNewChatChildId],
  )

  const handleRetrySendMessage = useCallback(() => {
    if (failedMessageText) {
      void handleSendMessage(failedMessageText)
    }
  }, [failedMessageText, handleSendMessage])

  const handleSelectChatChild = useCallback(
    async (childId: string) => {
      if (chatScopeChildId === childId) {
        setChatScopeChildId(null)
        navigate('/')
        return
      }
      setChatScopeChildId(childId)
      if (user) {
        await setActiveChild(user.id, childId)
        await refreshProfile()
      }
      navigate('/')
    },
    [chatScopeChildId, user, refreshProfile, navigate],
  )

  const handleNewChat = useCallback(() => {
    navigate('/')
    closeSidebarIfMobile()
  }, [navigate, closeSidebarIfMobile])

  const handleSelectChat = useCallback(
    (sessionId: string) => {
      const session = chatSessions.find((s) => s.id === sessionId)
      if (session) setChatScopeChildId(session.child_id)
      navigate(`/chat/${sessionId}`)
      closeSidebarIfMobile()
    },
    [chatSessions, navigate, closeSidebarIfMobile],
  )

  const handleAssignSessionChild = useCallback(
    async (childId: string) => {
      if (!activeChatSessionId) return
      setSessionChildBusy(true)
      try {
        const ok = await updateSessionChildId(activeChatSessionId, childId)
        if (ok) await refreshChatSessions()
      } finally {
        setSessionChildBusy(false)
      }
    },
    [activeChatSessionId, refreshChatSessions],
  )

  const handleOpenSettings = useCallback(() => {
    navigate('/settings')
    closeSidebarIfMobile()
  }, [navigate, closeSidebarIfMobile])

  const handleRemoveSessionChild = useCallback(async () => {
    if (!activeChatSessionId) return
    setSessionChildBusy(true)
    try {
      const ok = await updateSessionChildId(activeChatSessionId, null)
      if (ok) await refreshChatSessions()
    } finally {
      setSessionChildBusy(false)
    }
  }, [activeChatSessionId, refreshChatSessions])

  const sidebarProps = {
    activeTab,
    onTabChange: handleTabChange,
    programs,
    programsLoading,
    programsError,
    onRefreshPrograms: refreshPrograms,
    activeProgramId,
    programProgress,
    onSelectProgram: handleSelectProgram,
    routines,
    routinesLoading,
    routinesError,
    onRefreshRoutines: refreshRoutines,
    activeRoutineId,
    routineDueToday,
    onSelectRoutine: handleSelectRoutine,
    chatSessions: scopedChatSessions,
    activeChatSessionId,
    chatChildren: namedChatChildren,
    chatScopeChildId,
    showChatChildProjects,
    onSelectChatChild: handleSelectChatChild,
    onNewChat: handleNewChat,
    onSelectChat: handleSelectChat,
    onOpenSettings: handleOpenSettings,
    onClose: closeSidebarIfMobile,
  }

  const appClassName = [
    'app',
    getShellClassName(),
    isWide
      ? sidebarPinned
        ? 'app--sidebar-pinned'
        : ''
      : sidebarOverlayOpen
        ? 'app--sidebar-open'
        : '',
    isWide && sidebarPeek ? 'app--sidebar-peek' : '',
    sidebarResizing ? 'app--sidebar-resizing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={appClassName}>
      <ShellChrome
        sidebarOpen={isWide ? sidebarPinned : sidebarOverlayOpen}
        onToggleSidebar={handleToggleSidebar}
        centerContent={
          isChatActive && namedChatChildren.length > 0 ? (
            <ChatProjectControl
              childId={activeChatSession?.child_id ?? null}
              children={namedChatChildren}
              busy={sessionChildBusy}
              onAssignChild={handleAssignSessionChild}
              onRemoveFromChild={handleRemoveSessionChild}
            />
          ) : chatScopeChildId && chatScopeChildName && activeTab === 'chat' ? (
            <ChatProjectLabel name={chatScopeChildName} />
          ) : undefined
        }
      />

      <div className="app-shell">
        {isWide && !sidebarPinned && sidebarPeek && (
          <button
            type="button"
            className="sidebar-peek-backdrop"
            aria-label="Close sidebar"
            onClick={dismissSidebarPeek}
          />
        )}

        {isWide && !sidebarPinned && (
          <div
            className={`sidebar-flyout ${sidebarPeek ? 'sidebar-flyout--open' : ''}`}
            onMouseEnter={() => setSidebarPeek(true)}
            onMouseLeave={() => setSidebarPeek(false)}
          >
            <div className="sidebar-flyout-hit" aria-hidden />
            <Sidebar {...sidebarProps} open={sidebarPeek} variant="flyout" />
          </div>
        )}

        <div
          className={`sidebar-slot ${isWide && !sidebarPinned ? 'sidebar-slot--collapsed' : ''}`}
        >
          {(!isWide || sidebarPinned) && (
            <Sidebar
              {...sidebarProps}
              open={isWide ? sidebarPinned : sidebarOverlayOpen}
              variant={isWide ? 'docked' : 'overlay'}
            />
          )}
          {isWide && sidebarPinned && (
            <SidebarResizeHandle onResizeStart={startResize} />
          )}
        </div>

        <main
          className={`main ${isRunnerActive || isChatActive || isSettingsActive ? 'main--program' : ''} ${isChatActive ? 'main--chat' : ''} ${isSettingsActive ? 'main--settings' : ''}`}
        >
          <AppRoutes
            displayName={profile?.display_name}
            showSetupCta={showSetupCta}
            enrolledProgram={enrolledProgram}
            enrolledRoutine={enrolledRoutine}
            programs={programs}
            programsLoading={programsLoading}
            programsError={programsError}
            onRefreshPrograms={refreshPrograms}
            routines={routines}
            routinesLoading={routinesLoading}
            routinesError={routinesError}
            onRefreshRoutines={refreshRoutines}
            programProgress={programProgress}
            history={history}
            onUpdateProgress={updateProgress}
            onRoutineComplete={addEntry}
            onSelectProgram={handleSelectProgram}
            onSelectRoutine={handleSelectRoutine}
            onExplorePrograms={handleExplorePrograms}
            onExploreRoutines={handleExploreRoutines}
            onContinueProgram={handleContinueProgram}
            onContinueRoutine={handleContinueRoutine}
            onStartChat={handleStartChat}
            onStartRoutine={handleStartRoutine}
            onStartSetup={handleStartSetup}
            onDismissSetup={handleDismissSetup}
            onSendMessage={handleSendMessage}
            sendingMessage={sendingMessage}
            sendError={sendError}
            onDismissSendError={() => setSendError(null)}
            onRetrySendMessage={handleRetrySendMessage}
            onSessionActivity={refreshChatSessions}
            chatSessions={scopedChatSessions}
            chatScopeChildId={chatScopeChildId}
            scopeChildName={chatScopeChildName}
            onSelectChat={handleSelectChat}
          />
        </main>
      </div>
    </div>
  )
}
