import type { IndexedEntry } from '../types'

const CATEGORY_COLORS: Record<string, string> = {
  Spell: 'bg-[#5B8DB8] text-white',
  Class: 'bg-[#8F69B3] text-white',
  Subclass: 'bg-[#A484C0] text-white',
  Species: 'bg-[#90A77B] text-white',
  Monster: 'bg-[#B56B5C] text-white',
  'Magic Item': 'bg-[#C4993C] text-white',
  Equipment: 'bg-[#B8894D] text-white',
  Feat: 'bg-[#6A9E96] text-white',
  Background: 'bg-[#8C8178] text-white',
}

interface Props {
  entry: IndexedEntry
  focused: boolean
  onClick: () => void
  onMouseEnter: () => void
}

export function SearchResult({ entry, focused, onClick, onMouseEnter }: Props) {
  const badgeClass = CATEGORY_COLORS[entry.category] ?? 'bg-[#8C8178] text-white'

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={[
        'flex items-center justify-between px-4 py-3 cursor-pointer',
        'hover:bg-warm-hover transition-colors duration-150',
        focused ? 'bg-warm-hover' : '',
      ].join(' ')}
      aria-label={`${entry.name} (${entry.category})`}
    >
      <span className="flex items-center gap-2 truncate mr-3">
        <span className="text-warm-text font-medium truncate">{entry.name}</span>
        {entry.edition === 'legacy' && (
          <span className="text-xs font-medium text-warm-muted shrink-0">2014</span>
        )}
      </span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
        {entry.category}
      </span>
    </a>
  )
}
