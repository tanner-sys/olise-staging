import { useCallback, useEffect, useState } from 'react'
import { fetchPrograms } from '../lib/programs'
import type { Program } from '../types/program'

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchPrograms()
    setPrograms(result.data)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { programs, loading, error, refresh }
}
