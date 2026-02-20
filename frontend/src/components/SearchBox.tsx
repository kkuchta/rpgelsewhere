import { useEffect, useRef, useState } from 'react'
import type { IndexedEntry } from '../types'
import { SearchResult } from './SearchResult'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  results: IndexedEntry[]
}

export function SearchBox({ query, onQueryChange, results }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rawFocusedIndex, setFocusedIndex] = useState(-1)

  // Clamp focusedIndex to valid range without setState-in-effect
  const focusedIndex = rawFocusedIndex >= results.length ? -1 : rawFocusedIndex

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => {
        const clamped = i >= results.length ? -1 : i
        return Math.min(clamped + 1, results.length - 1)
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => {
        const clamped = i >= results.length ? -1 : i
        return Math.max(clamped - 1, 0)
      })
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      const entry = results[focusedIndex]
      window.open(entry.url, '_blank', 'noreferrer')
    } else if (e.key === 'Escape') {
      onQueryChange('')
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search spells, monsters, classes..."
        aria-label="Search D&D content"
        aria-autocomplete="list"
        aria-controls={results.length > 0 ? 'search-results' : undefined}
        className={[
          'w-full px-5 py-4 text-lg',
          'bg-gray-800 text-white placeholder-gray-400',
          'border-2 border-gray-600 focus:border-indigo-500 focus:outline-none',
          results.length > 0 ? 'rounded-t-xl' : 'rounded-xl',
          'transition-colors',
        ].join(' ')}
      />
      {results.length > 0 && (
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="bg-gray-800 border-2 border-t-0 border-gray-600 rounded-b-xl overflow-hidden divide-y divide-gray-700"
        >
          {results.map((entry, i) => (
            <SearchResult
              key={entry.id}
              entry={entry}
              focused={i === focusedIndex}
              onClick={() => setFocusedIndex(i)}
              onMouseEnter={() => setFocusedIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
