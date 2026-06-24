import { ArrowLeft, ArrowRight, Check, MessageSquare, Repeat } from 'lucide-react'
import type { Program, ProgramProgress } from '../types/program'
import './ProgramRunner.css'

type ProgramRunnerProps = {
  program: Program
  progress: ProgramProgress
  onBack: () => void
  onUpdateProgress: (progress: ProgramProgress) => void
  onStartRoutine?: () => void
  onStartChat?: () => void
}

export function ProgramRunner({
  program,
  progress,
  onBack,
  onUpdateProgress,
  onStartRoutine,
  onStartChat,
}: ProgramRunnerProps) {
  const step = program.steps[progress.stepIndex]
  const totalSteps = program.steps.length
  const progressPercent = Math.round(((progress.stepIndex + 1) / totalSteps) * 100)
  const isFirst = progress.stepIndex === 0
  const isLast = progress.stepIndex === totalSteps - 1

  function setAnswer(questionId: string, value: string) {
    onUpdateProgress({
      ...progress,
      answers: { ...progress.answers, [questionId]: value },
    })
  }

  function canContinue() {
    if (step.type === 'assessment' && step.questions) {
      return step.questions.every((q) => progress.answers[q.id]?.trim())
    }
    if (step.type === 'reflection') {
      return Boolean(progress.answers[step.id]?.trim())
    }
    return true
  }

  function goNext() {
    if (!canContinue()) return
    if (isLast) {
      onUpdateProgress({ ...progress, completed: true })
      return
    }
    onUpdateProgress({ ...progress, stepIndex: progress.stepIndex + 1 })
  }

  function goBack() {
    if (isFirst) {
      onBack()
      return
    }
    onUpdateProgress({ ...progress, stepIndex: progress.stepIndex - 1 })
  }

  return (
    <div className="program-runner">
      <header className="program-runner-header">
        <button type="button" className="program-exit" onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={1.75} />
          <span>Programs</span>
        </button>
        <div className="program-progress-bar" aria-hidden="true">
          <div className="program-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="program-progress-label">
          {progress.stepIndex + 1} / {totalSteps}
        </span>
      </header>

      <article className="program-step">
        {step.subtitle && <p className="program-step-eyebrow">{step.subtitle}</p>}
        <h1 className="program-step-title">{step.title}</h1>

        {step.type === 'intro' && (
          <div className="program-step-body">
            {step.body?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {step.bullets && (
              <ul className="program-bullets">
                {step.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step.type === 'assessment' && step.questions && (
          <div className="program-assessment">
            {step.questions.map((question) => (
              <fieldset key={question.id} className="program-question">
                <legend>{question.prompt}</legend>
                <div className="program-options">
                  {question.options.map((option) => {
                    const selected = progress.answers[question.id] === option
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`program-option ${selected ? 'program-option--selected' : ''}`}
                        onClick={() => setAnswer(question.id, option)}
                      >
                        <span className="program-option-radio" aria-hidden="true" />
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {step.type === 'content' && (
          <div className="program-step-body">
            {step.body?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {step.bullets && (
              <ul className="program-bullets">
                {step.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step.type === 'reflection' && (
          <div className="program-reflection">
            <label className="program-reflection-label" htmlFor="reflection-input">
              {step.reflectionPrompt}
            </label>
            <textarea
              id="reflection-input"
              className="program-reflection-input"
              rows={5}
              value={progress.answers[step.id] ?? ''}
              onChange={(e) => setAnswer(step.id, e.target.value)}
              placeholder="Write your reflection here..."
            />
          </div>
        )}

        {step.type === 'completion' && (
          <div className="program-completion">
            <div className="program-completion-icon" aria-hidden="true">
              <Check size={20} strokeWidth={2} />
            </div>
            {step.body?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="program-completion-actions">
              <button type="button" className="program-cta program-cta--secondary" onClick={onStartRoutine}>
                <Repeat size={14} strokeWidth={1.75} />
                <span>Create a routine</span>
              </button>
              <button type="button" className="program-cta program-cta--primary" onClick={onStartChat}>
                <MessageSquare size={14} strokeWidth={1.75} />
                <span>Discuss in chat</span>
              </button>
            </div>
          </div>
        )}
      </article>

      {step.type !== 'completion' && (
        <footer className="program-runner-footer">
          <button type="button" className="program-nav-btn program-nav-btn--ghost" onClick={goBack}>
            {isFirst ? 'Exit' : 'Back'}
          </button>
          <button
            type="button"
            className="program-nav-btn program-nav-btn--primary"
            onClick={goNext}
            disabled={!canContinue()}
          >
            <span>{isLast ? 'Complete' : 'Continue'}</span>
            <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        </footer>
      )}
    </div>
  )
}
