import type { IndexedEntry } from '../types'

const CATEGORY_COLORS: Record<string, string> = {
  Spell: 'bg-blue-800 text-blue-200',
  Class: 'bg-purple-800 text-purple-200',
  Subclass: 'bg-violet-800 text-violet-200',
  Species: 'bg-green-800 text-green-200',
  Monster: 'bg-red-800 text-red-200',
  'Magic Item': 'bg-yellow-800 text-yellow-200',
  Equipment: 'bg-orange-800 text-orange-200',
  Feat: 'bg-teal-800 text-teal-200',
  Background: 'bg-stone-700 text-stone-200',
}

interface Props {
  entry: IndexedEntry
  focused: boolean
  onClick: () => void
  onMouseEnter: () => void
}

export function SearchResult({ entry, focused, onClick, onMouseEnter }: Props) {
  const badgeClass = CATEGORY_COLORS[entry.category] ?? 'bg-gray-700 text-gray-200'

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={[
        'flex items-center justify-between px-4 py-3 cursor-pointer',
        'hover:bg-gray-700 transition-colors',
        focused ? 'bg-gray-700' : '',
      ].join(' ')}
      aria-label={`${entry.name} (${entry.category})`}
    >
      <span className="flex items-center gap-2 truncate mr-3">
        <span className="text-white font-medium truncate">{entry.name}</span>
        {entry.edition === 'legacy' && (
          <span className="text-xs font-medium text-gray-400 shrink-0">2014</span>
        )}
      </span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
        {entry.category}
      </span>
    </a>
  )
}
