import type { IndexedEntry } from '../types'
import { scoreEntry } from './scoring'

const TOP_N = 20

export function indexEntries(entries: Array<{ id: number; name: string; category: string; url: string; created_at: string; updated_at: string }>): IndexedEntry[] {
  return entries.map(e => ({
    ...e,
    nameLower: e.name.toLowerCase(),
    categoryLower: e.category.toLowerCase(),
    nameWords: e.name.toLowerCase().split(/\s+/).filter(Boolean),
  }))
}

export function search(query: string, entries: IndexedEntry[], showLegacy = true): IndexedEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const pool = showLegacy ? entries : entries.filter(e => e.edition !== 'legacy')

  const scored: Array<{ entry: IndexedEntry; score: number }> = []

  for (const entry of pool) {
    const score = scoreEntry(q, entry)
    if (score > 0) {
      scored.push({ entry, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, TOP_N).map(s => s.entry)
}
