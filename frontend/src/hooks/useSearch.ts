import { useState } from 'react'
import type { IndexedEntry } from '../types'
import { search } from '../search/search'

const SHOW_LEGACY_KEY = 'rpgelsewhere.showLegacy'

function loadShowLegacy(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_LEGACY_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

interface UseSearchResult {
  query: string
  setQuery: (q: string) => void
  results: IndexedEntry[]
  showLegacy: boolean
  setShowLegacy: (v: boolean) => void
}

export function useSearch(entries: IndexedEntry[]): UseSearchResult {
  const [query, setQuery] = useState('')
  const [showLegacy, setShowLegacyState] = useState(loadShowLegacy)

  function setShowLegacy(v: boolean) {
    try {
      localStorage.setItem(SHOW_LEGACY_KEY, String(v))
    } catch {
      // ignore storage errors (e.g. private browsing quota)
    }
    setShowLegacyState(v)
  }

  const results = search(query, entries, showLegacy)

  return { query, setQuery, results, showLegacy, setShowLegacy }
}
