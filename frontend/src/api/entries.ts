import type { Entry } from '../types'

export async function fetchEntries(): Promise<Entry[]> {
  const response = await fetch('/api/entries')
  if (!response.ok) {
    throw new Error(`Failed to fetch entries: ${response.statusText}`)
  }
  return response.json() as Promise<Entry[]>
}

export async function createEntry(entry: Omit<Entry, 'id' | 'created_at' | 'updated_at'>): Promise<Entry> {
  const response = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!response.ok) {
    throw new Error(`Failed to create entry: ${response.statusText}`)
  }
  return response.json() as Promise<Entry>
}

export async function updateEntry(id: number, entry: Omit<Entry, 'id' | 'created_at' | 'updated_at'>): Promise<Entry> {
  const response = await fetch(`/api/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!response.ok) {
    throw new Error(`Failed to update entry: ${response.statusText}`)
  }
  return response.json() as Promise<Entry>
}

export async function deleteEntry(id: number): Promise<void> {
  const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Failed to delete entry: ${response.statusText}`)
  }
}
