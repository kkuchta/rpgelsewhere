import { useEffect, useState } from 'react'
import { fetchEntries } from '../api/entries'
import type { IndexedEntry } from '../types'
import { indexEntries } from '../search/search'

interface UseEntriesResult {
  entries: IndexedEntry[]
  loading: boolean
  error: string | null
}

export function useEntries(): UseEntriesResult {
  const [entries, setEntries] = useState<IndexedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }, [])

  return { entries, loading, error }
}
