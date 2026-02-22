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
  const [rawFocusedIndex, setFocusedIndex] = useState(0)

  // When results are present, clamp to valid range and default to 0.
  // When there are no results, return -1 so Enter is a no-op.
  const focusedIndex =
    results.length === 0 ? -1 : Math.min(Math.max(rawFocusedIndex, 0), results.length - 1)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(Math.max(i + 1, 0), results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(Math.min(i, results.length - 1) - 1, 0))
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
        onChange={e => {
          onQueryChange(e.target.value)
          setFocusedIndex(0)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search spells, monsters, classes..."
        aria-label="Search D&D content"
        aria-autocomplete="list"
        aria-controls={results.length > 0 ? 'search-results' : undefined}
        className={[
          'w-full px-5 py-4 text-lg',
          'bg-warm-input text-warm-text placeholder-warm-muted',
          'border-2 border-warm-border focus:border-warm-accent focus:outline-none',
          results.length > 0 ? 'rounded-t-xl' : 'rounded-xl',
          'transition-colors duration-150',
        ].join(' ')}
      />
      {results.length > 0 && (
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="bg-warm-surface border-2 border-t-0 border-warm-border rounded-b-xl overflow-hidden divide-y divide-warm-divider"
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
