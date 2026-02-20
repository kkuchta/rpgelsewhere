import { useEffect, useState } from 'react'
import { fetchEntries } from '../api/entries'
import type { IndexedEntry } from '../types'
import { indexEntries } from '../search/search'

interface UseEntriesResult {
  entries: IndexedEntry[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useEntries(): UseEntriesResult {
  const [entries, setEntries] = useState<IndexedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  function reload() {
    setLoading(true)
    setError(null)
    setTick(t => t + 1)
  }

  useEffect(() => {
    let cancelled = false

    fetchEntries()
      .then(raw => {
        if (!cancelled) {
          setEntries(indexEntries(raw))
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  return { entries, loading, error, reload }
}
