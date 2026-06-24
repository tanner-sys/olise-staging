import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Download,
  LayoutGrid,
  MessageSquare,
  Plus,
  Repeat,
  Search,
  SlidersHorizontal,
  User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPlatform } from '../platform/detect'
import { displayChildName } from '../lib/children'
import { DesktopUpdateButton } from './desktop/DesktopUpdateButton'
import type { ChatSession } from '../hooks/useChatSessions'
import type { ChildProfile } from '../types/database'
import type { Routine } from '../types/routine'
import type { Program, ProgramProgress, ProgramStatus, SidebarTab } from '../types/program'
import './Sidebar.css'

const tabs: { id: SidebarTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'programs', label: 'Programs', icon: LayoutGrid },
  { id: 'routines', label: 'Routines', icon: Repeat },
]

function getProgramStatus(progress?: ProgramProgress): ProgramStatus {
  if (!progress) return 'not_started'
  if (progress.completed) return 'completed'
  if (progress.stepIndex > 0 || Object.keys(progress.answers).length > 0) return 'in_progress'
  return 'not_started'
}

const statusLabels: Record<ProgramStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Complete',
}

function getRoutineStatus(dueToday: boolean): 'due' | 'complete' {
  return dueToday ? 'due' : 'complete'
}

const routineStatusLabels = {
  due: 'Due today',
  complete: 'Done today',
}

type SidebarProps = {
  open: boolean
  onClose: () => void
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  programs: Program[]
  programsLoading: boolean
  programsError?: string | null
  onRefreshPrograms?: () => void
  activeProgramId: string | null
  programProgress: Record<string, ProgramProgress>
  onSelectProgram: (programId: string) => void
  routines: Routine[]
  routinesLoading: boolean
  routinesError?: string | null
  onRefreshRoutines?: () => void
  activeRoutineId: string | null
  routineDueToday: Record<string, boolean>
  onSelectRoutine: (routineId: string) => void
  chatSessions: ChatSession[]
  activeChatSessionId: string | null
  chatChildren: ChildProfile[]
  chatScopeChildId: string | null
  showChatChildProjects: boolean
  onSelectChatChild: (childId: string) => void
  onNewChat: () => void
  onSelectChat: (sessionId: string) => void
  onOpenSettings: () => void
}

export function Sidebar({
  open,
  onClose,
  activeTab,
  onTabChange,
  programs,
  programsLoading,
  programsError,
  onRefreshPrograms,
  activeProgramId,
  programProgress,
  onSelectProgram,
  routines,
  routinesLoading,
  routinesError,
  onRefreshRoutines,
  activeRoutineId,
  routineDueToday,
  onSelectRoutine,
  chatSessions,
  activeChatSessionId,
  chatChildren,
  chatScopeChildId,
  showChatChildProjects,
  onSelectChatChild,
  onNewChat,
  onSelectChat,
  onOpenSettings,
}: SidebarProps) {
  const { profile } = useAuth()
  const isDesktop = getPlatform() === 'desktop'
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRecents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return chatSessions
    return chatSessions.filter((session) => session.title.toLowerCase().includes(query))
  }, [searchQuery, chatSessions])

  const scopeLabelChild = chatScopeChildId
    ? chatChildren.find((child) => child.id === chatScopeChildId)
    : undefined
  const recentsLabel = scopeLabelChild
    ? `${displayChildName(scopeLabelChild)}'s chats`
    : 'Recents'

  const filteredPrograms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return programs
    return programs.filter(
      (program) =>
        program.title.toLowerCase().includes(query) ||
        program.description.toLowerCase().includes(query) ||
        program.tags.some((tag) => tag.toLowerCase().includes(query)),
    )
  }, [searchQuery, programs])

  const filteredRoutines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return routines
    return routines.filter(
      (routine) =>
        routine.title.toLowerCase().includes(query) ||
        routine.description.toLowerCase().includes(query),
    )
  }, [searchQuery, routines])

  function handleTabChange(tab: SidebarTab) {
    onTabChange(tab)
    setSearchQuery('')
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-hidden={!open}>
        <div className="sidebar-tabs" role="tablist" aria-label="Sidebar sections">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`sidebar-tab ${isActive ? 'sidebar-tab--active' : ''}`}
                onClick={() => handleTabChange(id)}
              >
                <Icon size={13} strokeWidth={1.75} className="sidebar-tab-icon" />
                <span className="sidebar-tab-label">{label}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'chat' && (
          <>
            <nav className="sidebar-nav">
              <button type="button" className="sidebar-nav-item" onClick={onNewChat}>
                <Plus size={14} strokeWidth={1.75} />
                <span>New chat</span>
              </button>
              <button type="button" className="sidebar-nav-item" disabled>
                <SlidersHorizontal size={14} strokeWidth={1.75} />
                <span>Customize</span>
              </button>
            </nav>

            <div className="sidebar-history">
              {showChatChildProjects && (
                <nav className="sidebar-child-projects" aria-label="Child chat projects">
                  <p className="sidebar-recents-label sidebar-child-projects-label">Children</p>
                  {chatChildren.map((child) => {
                    const isActive = chatScopeChildId === child.id
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={`sidebar-child-project ${isActive ? 'sidebar-child-project--active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() => onSelectChatChild(child.id)}
                      >
                        <User size={14} strokeWidth={1.75} />
                        <span>{displayChildName(child)}</span>
                      </button>
                    )
                  })}
                </nav>
              )}

              <div className="sidebar-search">
                <Search size={13} strokeWidth={1.75} className="sidebar-search-icon" />
                <input
                  type="search"
                  className="sidebar-search-input"
                  placeholder="Search chat history"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="sidebar-recents">
                <p className="sidebar-recents-label">{recentsLabel}</p>
                <ul className="sidebar-recents-list">
                  {filteredRecents.length > 0 ? (
                    filteredRecents.map((session) => (
                      <li key={session.id}>
                        <button
                          type="button"
                          className={`sidebar-recent-item ${activeChatSessionId === session.id ? 'sidebar-recent-item--active' : ''}`}
                          onClick={() => onSelectChat(session.id)}
                        >
                          {session.title}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="sidebar-recents-empty">
                      {searchQuery.trim()
                        ? 'No matching chats'
                        : showChatChildProjects && chatScopeChildId
                          ? 'No chats for this child yet'
                          : 'No chats yet — start one from home'}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}

        {activeTab === 'programs' && (
          <div className="sidebar-history">
            <div className="sidebar-search">
              <Search size={13} strokeWidth={1.75} className="sidebar-search-icon" />
              <input
                type="search"
                className="sidebar-search-input"
                placeholder="Search programs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sidebar-recents">
              <p className="sidebar-recents-label">Catalog</p>
              <ul className="sidebar-recents-list sidebar-program-list">
                {programsLoading ? (
                  <li className="sidebar-recents-empty">Loading programs…</li>
                ) : programsError ? (
                  <li className="sidebar-recents-empty sidebar-recents-empty--error">
                    <span>Couldn&apos;t load catalog.</span>
                    {onRefreshPrograms && (
                      <button type="button" className="sidebar-recents-retry" onClick={onRefreshPrograms}>
                        Retry
                      </button>
                    )}
                  </li>
                ) : filteredPrograms.length > 0 ? (
                  filteredPrograms.map((program) => {
                    const status = getProgramStatus(programProgress[program.id])
                    const isActive = activeProgramId === program.id
                    return (
                      <li key={program.id}>
                        <button
                          type="button"
                          className={`sidebar-program-card ${isActive ? 'sidebar-program-card--active' : ''}`}
                          onClick={() => onSelectProgram(program.id)}
                        >
                          <span className="sidebar-program-card-title">{program.title}</span>
                          <span className="sidebar-program-card-meta">
                            <span>{program.duration}</span>
                            <span className={`sidebar-program-status sidebar-program-status--${status}`}>
                              {statusLabels[status]}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })
                ) : (
                  <li className="sidebar-recents-empty">
                    {searchQuery.trim() ? 'No matching programs' : 'No programs available'}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'routines' && (
          <div className="sidebar-history">
            <div className="sidebar-search">
              <Search size={13} strokeWidth={1.75} className="sidebar-search-icon" />
              <input
                type="search"
                className="sidebar-search-input"
                placeholder="Search routines"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sidebar-recents">
              <p className="sidebar-recents-label">Catalog</p>
              <ul className="sidebar-recents-list sidebar-program-list">
                {routinesLoading ? (
                  <li className="sidebar-recents-empty">Loading routines…</li>
                ) : routinesError ? (
                  <li className="sidebar-recents-empty sidebar-recents-empty--error">
                    <span>Couldn&apos;t load catalog.</span>
                    {onRefreshRoutines && (
                      <button type="button" className="sidebar-recents-retry" onClick={onRefreshRoutines}>
                        Retry
                      </button>
                    )}
                  </li>
                ) : filteredRoutines.length > 0 ? (
                  filteredRoutines.map((routine) => {
                    const status = getRoutineStatus(routineDueToday[routine.id] ?? true)
                    const isActive = activeRoutineId === routine.id
                    return (
                      <li key={routine.id}>
                        <button
                          type="button"
                          className={`sidebar-program-card ${isActive ? 'sidebar-program-card--active' : ''}`}
                          onClick={() => onSelectRoutine(routine.id)}
                        >
                          <span className="sidebar-program-card-title">{routine.title}</span>
                          <span className="sidebar-program-card-meta">
                            <span>{routine.frequency}</span>
                            <span className={`sidebar-program-status sidebar-program-status--${status === 'complete' ? 'completed' : 'in_progress'}`}>
                              {routineStatusLabels[status]}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })
                ) : (
                  <li className="sidebar-recents-empty">
                    {searchQuery.trim() ? 'No matching routines' : 'No routines available'}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <button type="button" className="sidebar-profile-main" onClick={onOpenSettings}>
              <span className="sidebar-avatar" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 11V3.5C2 3.5 3.5 2 5.5 3.5C7.5 5 7.5 9 7.5 9C7.5 9 7.5 5 9.5 3.5C11.5 2 13 3.5 13 3.5V11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="sidebar-profile-name">
                {profile?.display_name ? `${profile.display_name} · Olise` : 'Olise'}
              </span>
              <ChevronDown size={12} strokeWidth={2} />
            </button>
            <DesktopUpdateButton />
            {!isDesktop && (
            <button type="button" className="sidebar-download" aria-label="Download app">
              <Download size={14} strokeWidth={1.75} />
            </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
