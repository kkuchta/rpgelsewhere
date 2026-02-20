import { useState } from 'react'
import type { IndexedEntry } from '../types'
import { search } from '../search/search'

interface UseSearchResult {
  query: string
  setQuery: (q: string) => void
  results: IndexedEntry[]
}

export function useSearch(entries: IndexedEntry[]): UseSearchResult {
  const [query, setQuery] = useState('')

  const results = search(query, entries)

  return { query, setQuery, results }
}
