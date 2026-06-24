import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { activeChildren, resolveCheckInChildId } from '../lib/children'
import { loadRoutineHistory, saveCheckInEntry } from '../lib/routineHistory'
import type { CheckInEntry } from '../types/routine'
import { getTodayDateString } from '../utils/routineScores'

export function useRoutineHistory() {
  const { user, profile, children } = useAuth()
  const childList = activeChildren(children)
  const resolvedChildId = useMemo(
    () => resolveCheckInChildId(profile, children),
    [profile, children],
  )
  const loadChildId = childList.length > 1 ? null : resolvedChildId

  const [history, setHistory] = useState<CheckInEntry[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) {
      setHistory([])
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    void loadRoutineHistory(user.id, loadChildId).then((data) => {
      if (!cancelled) {
        setHistory(data)
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, loadChildId])

  const addEntry = useCallback(
    (entry: CheckInEntry) => {
      const saveChildId = entry.childId ?? resolvedChildId

      setHistory((prev) => {
        const withoutToday = prev.filter(
          (item) =>
            !(
              item.routineId === entry.routineId &&
              item.date === entry.date &&
              (saveChildId ? item.childId === saveChildId : true)
            ),
        )
        return [...withoutToday, { ...entry, childId: saveChildId ?? entry.childId }].sort((a, b) =>
          a.date.localeCompare(b.date),
        )
      })

      if (!user || !saveChildId) return

      void saveCheckInEntry({ caregiverId: user.id, childId: saveChildId, entry }).then((savedId) => {
        if (!savedId || savedId === entry.id) return
        setHistory((prev) =>
          prev.map((item) =>
            item.routineId === entry.routineId &&
            item.date === entry.date &&
            item.childId === saveChildId
              ? { ...item, id: savedId }
              : item,
          ),
        )
      })
    },
    [user, resolvedChildId],
  )

  const getEntriesForRoutine = useCallback(
    (routineId: string, childId?: string | null) =>
      history.filter(
        (entry) => entry.routineId === routineId && (childId ? entry.childId === childId : true),
      ),
    [history],
  )

  const getTodayEntry = useCallback(
    (routineId: string, childId?: string | null) => {
      const today = getTodayDateString()
      return history.find(
        (entry) =>
          entry.routineId === routineId &&
          entry.date === today &&
          (childId ? entry.childId === childId : true),
      )
    },
    [history],
  )

  const isRoutineDueToday = useCallback(
    (routineId: string) => {
      if (childList.length === 0) return true
      const today = getTodayDateString()
      return childList.some(
        (child) =>
          !history.some(
            (entry) =>
              entry.routineId === routineId &&
              entry.date === today &&
              entry.childId === child.id,
          ),
      )
    },
    [childList, history],
  )

  return {
    history,
    ready,
    addEntry,
    getEntriesForRoutine,
    getTodayEntry,
    isRoutineDueToday,
  }
}
