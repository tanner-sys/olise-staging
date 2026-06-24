import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BarChart3, Check } from 'lucide-react'
import type { CaregiverProfile, ChildProfile } from '../types/database'
import type { CheckInEntry, Routine, RoutineSession } from '../types/routine'
import {
  activeChildren,
  displayChildName,
  getChildCheckInGate,
  resolveCheckInChildId,
} from '../lib/children'
import {
  buildCheckInEntry,
  formatShortDate,
  getTodayDateString,
  scoreToPercent,
} from '../utils/routineScores'
import { StatePanel } from './state/StatePanel'
import './RoutineRunner.css'

type RoutineView = 'home' | 'checkin' | 'results' | 'trends'

type RoutineRunnerProps = {
  routine: Routine
  profile: CaregiverProfile | null
  childProfiles: ChildProfile[]
  history: CheckInEntry[]
  onBack: () => void
  onComplete: (entry: CheckInEntry, childId: string) => void
  onSetupProfile: () => void
  onContinueWithoutNaming: () => Promise<void>
  onSelectChild: (childId: string) => Promise<void>
  pendingAutoStart?: boolean
  onAutoStartHandled?: () => void
  childGateBusy?: boolean
}

const SCALE = [1, 2, 3, 4, 5] as const

function TrendChart({ entries }: { entries: CheckInEntry[] }) {
  const width = 320
  const height = 120
  const padding = 12

  const points = useMemo(() => {
    if (entries.length === 0) return ''
    const innerWidth = width - padding * 2
    const innerHeight = height - padding * 2
    return entries
      .map((entry, index) => {
        const x = padding + (index / Math.max(entries.length - 1, 1)) * innerWidth
        const y = padding + innerHeight - (entry.compositeScore / 100) * innerHeight
        return `${x},${y}`
      })
      .join(' ')
  }, [entries])

  if (entries.length === 0) {
    return (
      <StatePanel
        variant="empty"
        title="No check-in history yet"
        description="Complete your first daily check-in to see composite trends over time."
        size="compact"
      />
    )
  }

  return (
    <div className="routine-trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Composite score trend">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="routine-chart-axis"
        />
        {entries.length > 1 && (
          <polyline points={points} className="routine-chart-line" fill="none" />
        )}
        {entries.map((entry, index) => {
          const innerWidth = width - padding * 2
          const innerHeight = height - padding * 2
          const x = padding + (index / Math.max(entries.length - 1, 1)) * innerWidth
          const y = padding + innerHeight - (entry.compositeScore / 100) * innerHeight
          return (
            <g key={entry.id}>
              <circle cx={x} cy={y} r="4" className="routine-chart-dot" />
              <text x={x} y={height - 2} className="routine-chart-label" textAnchor="middle">
                {formatShortDate(entry.date)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function RoutineRunner({
  routine,
  profile,
  childProfiles,
  history,
  onBack,
  onComplete,
  onSetupProfile,
  onContinueWithoutNaming,
  onSelectChild,
  pendingAutoStart = false,
  onAutoStartHandled,
  childGateBusy = false,
}: RoutineRunnerProps) {
  const childList = activeChildren(childProfiles)
  const checkInGate = useMemo(() => getChildCheckInGate(profile, childProfiles), [profile, childProfiles])

  const [view, setView] = useState<RoutineView>('home')
  const [homeStep, setHomeStep] = useState<'default' | 'first_child' | 'pick_child'>('default')
  const [session, setSession] = useState<RoutineSession>({ questionIndex: 0, answers: {} })
  const [checkInChildId, setCheckInChildId] = useState<string | null>(null)
  const [viewingChildId, setViewingChildId] = useState<string | null>(null)

  const today = getTodayDateString()

  const getTodayEntryForChild = (childId: string) =>
    history.find(
      (entry) => entry.routineId === routine.id && entry.date === today && entry.childId === childId,
    )

  const resolvedChildId = resolveCheckInChildId(profile, childProfiles)

  const focusChildId = viewingChildId ?? checkInChildId ?? resolvedChildId ?? childList[0]?.id ?? null
  const focusChild = childList.find((child) => child.id === focusChildId)
  const focusTodayEntry = focusChildId ? getTodayEntryForChild(focusChildId) : undefined
  const routineHistory = history.filter(
    (entry) => entry.routineId === routine.id && (!focusChildId || entry.childId === focusChildId),
  )

  const question = routine.questions[session.questionIndex]
  const totalQuestions = routine.questions.length
  const isLastQuestion = session.questionIndex === totalQuestions - 1
  const currentAnswer = question ? session.answers[question.id] : undefined

  useEffect(() => {
    if (!pendingAutoStart || childList.length !== 1) return
    void beginCheckIn(childList[0].id).then(() => onAutoStartHandled?.())
  }, [pendingAutoStart, childList, onAutoStartHandled])

  async function beginCheckIn(childId: string) {
    await onSelectChild(childId)
    setCheckInChildId(childId)
    setViewingChildId(childId)
    setSession({ questionIndex: 0, answers: {} })
    setView('checkin')
  }

  async function handleStartCheckIn() {
    if (checkInGate.type === 'first_child') {
      setHomeStep('first_child')
      return
    }
    if (checkInGate.type === 'pick_child') {
      setHomeStep('pick_child')
      return
    }
    const childId = resolvedChildId ?? childList[0]?.id
    if (!childId) return
    await beginCheckIn(childId)
  }

  async function handlePickChild(childId: string) {
    setHomeStep('default')
    await beginCheckIn(childId)
  }

  function setAnswer(value: number) {
    if (!question) return
    setSession((prev) => ({
      ...prev,
      answers: { ...prev.answers, [question.id]: value },
    }))
  }

  function goNext() {
    if (!currentAnswer || !checkInChildId) return
    if (isLastQuestion) {
      const entry = buildCheckInEntry(routine, session.answers)
      const entryWithChild = { ...entry, childId: checkInChildId }
      onComplete(entryWithChild, checkInChildId)
      setViewingChildId(checkInChildId)
      setView('results')
      return
    }
    setSession((prev) => ({ ...prev, questionIndex: prev.questionIndex + 1 }))
  }

  function goBack() {
    if (view === 'checkin' && session.questionIndex > 0) {
      setSession((prev) => ({ ...prev, questionIndex: prev.questionIndex - 1 }))
      return
    }
    if (view === 'checkin') {
      setView('home')
      setHomeStep('default')
      return
    }
    if (view === 'results' || view === 'trends') {
      setView('home')
    }
  }

  const allCompleteToday =
    childList.length > 0 && childList.every((child) => Boolean(getTodayEntryForChild(child.id)))

  return (
    <div className="routine-runner">
      <header className="routine-runner-header">
        <button type="button" className="routine-exit" onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={1.75} />
          <span>Routines</span>
        </button>
        <div className="routine-view-tabs">
          <button
            type="button"
            className={`routine-view-tab ${view === 'home' || view === 'checkin' || view === 'results' ? 'routine-view-tab--active' : ''}`}
            onClick={() => setView(focusTodayEntry ? 'results' : 'home')}
          >
            Today
          </button>
          <button
            type="button"
            className={`routine-view-tab ${view === 'trends' ? 'routine-view-tab--active' : ''}`}
            onClick={() => setView('trends')}
          >
            <BarChart3 size={12} strokeWidth={1.75} />
            <span>Trends</span>
          </button>
        </div>
      </header>

      {view === 'home' && (
        <div className="routine-home">
          <p className="routine-eyebrow">{routine.frequency} routine</p>
          <h1 className="routine-title">{routine.title}</h1>
          <p className="routine-description">{routine.description}</p>

          {childList.length > 1 && (
            <p className="routine-home-lead">
              One check-in per child each day. Scores and trends are tracked separately.
            </p>
          )}

          {homeStep === 'first_child' && (
            <div className="routine-today-card routine-child-setup">
              <p className="routine-child-setup-eyebrow">Before you start</p>
              <p className="routine-child-setup-body">
                Daily check-ins are saved per child so you can track trends over time.
              </p>
              <div className="routine-home-actions routine-child-setup-actions">
                <button
                  type="button"
                  className="routine-btn routine-btn--primary"
                  onClick={onSetupProfile}
                  disabled={childGateBusy}
                >
                  Set up child profile
                </button>
                <button
                  type="button"
                  className="routine-btn routine-btn--secondary"
                  onClick={() => void onContinueWithoutNaming()}
                  disabled={childGateBusy}
                >
                  {childGateBusy ? 'Saving…' : 'Continue without naming'}
                </button>
              </div>
              <p className="routine-child-setup-footnote">
                You can add a name and details anytime from setup or settings.
              </p>
            </div>
          )}

          {homeStep === 'pick_child' && (
            <div className="routine-child-list">
              <p className="routine-child-list-label">Who is this check-in for?</p>
              {childList.map((child) => {
                const entry = getTodayEntryForChild(child.id)
                return (
                  <div key={child.id} className="routine-today-card routine-child-row">
                    <div className="routine-child-row-main">
                      <span className="routine-child-row-name">{displayChildName(child)}</span>
                      {entry ? (
                        <span className="routine-child-row-status routine-child-row-status--done">
                          <Check size={12} strokeWidth={2} />
                          Done today · {entry.compositeScore}
                        </span>
                      ) : (
                        <span className="routine-child-row-status">Not started</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="routine-btn routine-btn--primary"
                      onClick={() => void handlePickChild(child.id)}
                      disabled={Boolean(entry)}
                    >
                      {entry ? 'Complete' : 'Start check-in'}
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                className="routine-btn routine-btn--ghost routine-child-list-back"
                onClick={() => setHomeStep('default')}
              >
                Back
              </button>
            </div>
          )}

          {homeStep === 'default' && childList.length === 0 && (
            <div className="routine-no-children">
              <StatePanel
                variant="empty"
                title="Add a child to get started"
                description="Daily check-ins are tracked per child. Add a profile in Settings or continue without naming."
                primaryAction={{
                  label: 'Go to Settings',
                  onClick: onSetupProfile,
                }}
                secondaryAction={{
                  label: 'Continue without naming',
                  onClick: () => void onContinueWithoutNaming(),
                }}
                size="compact"
              />
            </div>
          )}

          {homeStep === 'default' && childList.length === 1 && (
            <>
              {focusTodayEntry ? (
                <div className="routine-today-card">
                  <div className="routine-today-score">
                    <span className="routine-today-score-value">{focusTodayEntry.compositeScore}</span>
                    <span className="routine-today-score-label">Composite today</span>
                  </div>
                  <p className="routine-today-done">
                    <Check size={14} strokeWidth={2} />
                    Check-in complete for today
                  </p>
                  <div className="routine-home-actions">
                    <button
                      type="button"
                      className="routine-btn routine-btn--secondary"
                      onClick={() => setView('results')}
                    >
                      View breakdown
                    </button>
                    <button
                      type="button"
                      className="routine-btn routine-btn--primary"
                      onClick={() => setView('trends')}
                    >
                      See trends
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="routine-btn routine-btn--primary routine-start-btn"
                  onClick={() => void handleStartCheckIn()}
                >
                  Start today&apos;s check-in
                </button>
              )}
            </>
          )}

          {homeStep === 'default' && childList.length > 1 && (
            <div className="routine-child-list">
              {childList.map((child) => {
                const entry = getTodayEntryForChild(child.id)
                return (
                  <div key={child.id} className="routine-today-card routine-child-row">
                    <div className="routine-child-row-main">
                      <span className="routine-child-row-name">{displayChildName(child)}</span>
                      {entry ? (
                        <span className="routine-child-row-status routine-child-row-status--done">
                          <Check size={12} strokeWidth={2} />
                          Done today · {entry.compositeScore}
                        </span>
                      ) : (
                        <span className="routine-child-row-status">Due today</span>
                      )}
                    </div>
                    {entry ? (
                      <button
                        type="button"
                        className="routine-btn routine-btn--secondary"
                        onClick={() => {
                          setViewingChildId(child.id)
                          setView('results')
                        }}
                      >
                        View breakdown
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="routine-btn routine-btn--primary"
                        onClick={() => void handlePickChild(child.id)}
                      >
                        Start check-in
                      </button>
                    )}
                  </div>
                )
              })}
              {allCompleteToday && (
                <button
                  type="button"
                  className="routine-btn routine-btn--secondary routine-start-btn"
                  onClick={() => setView('trends')}
                >
                  See trends
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'checkin' && question && (
        <>
          {focusChild && childList.length > 1 && (
            <p className="routine-checkin-child">
              Check-in for <span>{displayChildName(focusChild)}</span>
            </p>
          )}
          <div className="routine-progress-bar" aria-hidden="true">
            <div
              className="routine-progress-fill"
              style={{ width: `${((session.questionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
          <p className="routine-question-count">
            Question {session.questionIndex + 1} of {totalQuestions}
          </p>

          <article className="routine-question-card">
            <p className="routine-section-label">{question.section}</p>
            <h2 className="routine-question-prompt">{question.prompt}</h2>

            <div className="routine-scale">
              {SCALE.map((value) => {
                const selected = currentAnswer === value
                return (
                  <button
                    key={value}
                    type="button"
                    className={`routine-scale-btn ${selected ? 'routine-scale-btn--selected' : ''}`}
                    onClick={() => setAnswer(value)}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
            <div className="routine-scale-labels">
              <span>{question.lowLabel}</span>
              <span>{question.highLabel}</span>
            </div>
          </article>

          <footer className="routine-runner-footer">
            <button type="button" className="routine-btn routine-btn--ghost" onClick={goBack}>
              Back
            </button>
            <button
              type="button"
              className="routine-btn routine-btn--primary"
              onClick={goNext}
              disabled={!currentAnswer}
            >
              <span>{isLastQuestion ? 'Finish' : 'Next'}</span>
              <ArrowRight size={14} strokeWidth={1.75} />
            </button>
          </footer>
        </>
      )}

      {view === 'results' && focusTodayEntry && (
        <div className="routine-results">
          {focusChild && childList.length > 1 && (
            <p className="routine-checkin-child">
              Results for <span>{displayChildName(focusChild)}</span>
            </p>
          )}
          <div className="routine-composite-card">
            <p className="routine-composite-label">Composite score</p>
            <p className="routine-composite-value">{focusTodayEntry.compositeScore}</p>
            <p className="routine-composite-sub">Out of 100 · {formatShortDate(focusTodayEntry.date)}</p>
          </div>

          <h3 className="routine-breakdown-title">Section breakdown</h3>
          <ul className="routine-breakdown-list">
            {routine.questions.map((q) => {
              const raw = focusTodayEntry.sectionScores[q.id] ?? 0
              const percent = scoreToPercent(raw)
              return (
                <li key={q.id} className="routine-breakdown-item">
                  <div className="routine-breakdown-header">
                    <span className="routine-breakdown-section">{q.section}</span>
                    <span className="routine-breakdown-score">{percent}</span>
                  </div>
                  <div className="routine-breakdown-bar" aria-hidden="true">
                    <div className="routine-breakdown-fill" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>

          <button type="button" className="routine-btn routine-btn--secondary" onClick={() => setView('trends')}>
            View trends over time
          </button>
        </div>
      )}

      {view === 'trends' && (
        <div className="routine-trends">
          {childList.length > 1 && (
            <div className="routine-child-switcher">
              {childList.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={`routine-child-switcher-btn ${focusChildId === child.id ? 'routine-child-switcher-btn--active' : ''}`}
                  onClick={() => setViewingChildId(child.id)}
                >
                  {displayChildName(child)}
                </button>
              ))}
            </div>
          )}
          <h2 className="routine-trends-title">Progress over time</h2>
          <p className="routine-trends-sub">Composite score across your recent check-ins</p>

          <TrendChart entries={routineHistory.slice(-7)} />

          <h3 className="routine-breakdown-title">Section trends</h3>
          <ul className="routine-section-trends">
            {routine.questions.map((q) => {
              const sectionHistory = routineHistory.map((entry) => ({
                date: entry.date,
                score: scoreToPercent(entry.sectionScores[q.id] ?? 0),
              }))
              const average =
                sectionHistory.length > 0
                  ? Math.round(
                      sectionHistory.reduce((sum, item) => sum + item.score, 0) / sectionHistory.length,
                    )
                  : 0

              return (
                <li key={q.id} className="routine-section-trend-item">
                  <div className="routine-section-trend-header">
                    <span>{q.section}</span>
                    <span className="routine-section-trend-avg">Avg {average}</span>
                  </div>
                  <div className="routine-mini-chart" aria-hidden="true">
                    {sectionHistory.length === 0 ? (
                      <span className="routine-mini-chart-empty">—</span>
                    ) : (
                      sectionHistory.map((item) => (
                        <div
                          key={`${q.id}-${item.date}`}
                          className="routine-mini-bar"
                          style={{ height: `${Math.max(item.score, 8)}%` }}
                          title={`${formatShortDate(item.date)}: ${item.score}`}
                        />
                      ))
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
