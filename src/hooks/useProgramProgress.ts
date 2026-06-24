import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { loadProgramProgress, saveProgramProgress } from '../lib/programProgress'
import type { ProgramProgress } from '../types/program'

function createInitialProgress(): ProgramProgress {
  return { stepIndex: 0, answers: {}, completed: false }
}

export function useProgramProgress() {
  const { user, profile } = useAuth()
  const childId = profile?.active_child_id ?? null

  const [programProgress, setProgramProgress] = useState<Record<string, ProgramProgress>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) {
      setProgramProgress({})
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    void loadProgramProgress(user.id, childId).then((data) => {
      if (!cancelled) {
        setProgramProgress(data)
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, childId])

  const persist = useCallback(
    (programId: string, progress: ProgramProgress) => {
      if (!user) return
      void saveProgramProgress({
        caregiverId: user.id,
        programId,
        childId,
        progress,
      })
    },
    [user, childId],
  )

  const ensureProgram = useCallback(
    (programId: string) => {
      setProgramProgress((prev) => {
        if (prev[programId]) return prev
        const initial = createInitialProgress()
        persist(programId, initial)
        return { ...prev, [programId]: initial }
      })
    },
    [persist],
  )

  const updateProgress = useCallback(
    (programId: string, progress: ProgramProgress) => {
      setProgramProgress((prev) => ({ ...prev, [programId]: progress }))
      persist(programId, progress)
    },
    [persist],
  )

  const getProgress = useCallback(
    (programId: string) => programProgress[programId] ?? createInitialProgress(),
    [programProgress],
  )

  return { programProgress, ready, ensureProgram, updateProgress, getProgress }
}
