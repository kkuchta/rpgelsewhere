import type { IndexedEntry } from '../types'

export function scoreExactMatch(query: string, entry: IndexedEntry): number {
  return query === entry.nameLower ? 100 : 0
}

export function scorePrefixMatch(query: string, entry: IndexedEntry): number {
  return entry.nameLower.startsWith(query) ? 50 : 0
}

export function scoreMultiWordMatch(query: string, entry: IndexedEntry): number {
  const queryWords = query.split(' ').filter(Boolean)
  if (queryWords.length < 2) return 0
  const allMatch = queryWords.every(w => entry.nameLower.includes(w))
  return allMatch ? 40 : 0
}

export function scoreWordStartMatch(query: string, entry: IndexedEntry): number {
  const matches = entry.nameWords.some(word => word.startsWith(query))
  return matches ? 30 : 0
}

export function scoreSubstringMatch(query: string, entry: IndexedEntry): number {
  return entry.nameLower.includes(query) ? 15 : 0
}

const CATEGORY_BOOSTS: Record<string, number> = {
  class: 10,
  spell: 5,
  feat: 3,
  species: 3,
}

export function scoreCategoryBoost(_query: string, entry: IndexedEntry): number {
  return CATEGORY_BOOSTS[entry.categoryLower] ?? 0
}

export function scoreNameLength(_query: string, entry: IndexedEntry): number {
  const len = entry.name.length
  if (len <= 5) return -1
  if (len <= 10) return -2
  if (len <= 20) return -3
  if (len <= 30) return -4
  return -5
}

// Prefer 2024 entries over legacy (2014) entries when all else is equal
export function scoreEdition(_query: string, entry: IndexedEntry): number {
  return entry.edition === 'legacy' ? 0 : 2
}

export function scoreEntry(query: string, entry: IndexedEntry): number {
  const matchScore =
    scoreExactMatch(query, entry) +
    scorePrefixMatch(query, entry) +
    scoreMultiWordMatch(query, entry) +
    scoreWordStartMatch(query, entry) +
    scoreSubstringMatch(query, entry)

  if (matchScore === 0) return 0

  return matchScore + scoreCategoryBoost(query, entry) + scoreNameLength(query, entry) + scoreEdition(query, entry)
}
