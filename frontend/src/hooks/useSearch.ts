import { useState } from 'react'
import type { IndexedEntry } from '../types'
import { search } from '../search/search'

interface UseSearchResult {
  query: string
  setQuery: (q: string) => void
  results: IndexedEntry[]
  showLegacy: boolean
  setShowLegacy: (v: boolean) => void
}

export function useSearch(entries: IndexedEntry[]): UseSearchResult {
  const [query, setQuery] = useState('')
  const [showLegacy, setShowLegacy] = useState(true)

  const results = search(query, entries, showLegacy)

  return { query, setQuery, results, showLegacy, setShowLegacy }
}
