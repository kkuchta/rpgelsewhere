import type { Entry } from '../types'

export async function fetchEntries(): Promise<Entry[]> {
  const response = await fetch('/entries.json')
  if (response.status === 404) {
    throw new Error('entries.json not found — run `just export` to generate it')
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch entries: ${response.statusText}`)
  }
  return response.json() as Promise<Entry[]>
}
