import { useCallback, useEffect, useState } from 'react'
import { fetchRoutines } from '../lib/routines'
import type { Routine } from '../types/routine'

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchRoutines()
    setRoutines(result.data)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await fetchRoutines()
      if (!active) return
      setRoutines(result.data)
      setError(result.error)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  return { routines, loading, error, refresh }
}
