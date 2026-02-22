import type { Entry } from '../types'

export async function fetchEntries(): Promise<Entry[]> {
  const response = await fetch('/api/entries', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch entries: ${response.statusText}`)
  }
  return response.json() as Promise<Entry[]>
}

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export async function createEntry(
  entry: Omit<Entry, 'id' | 'created_at' | 'updated_at'>,
  token: string,
): Promise<Entry> {
  const response = await fetch('/api/entries', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(entry),
  })
  if (!response.ok) {
    throw new Error(`Failed to create entry: ${response.statusText}`)
  }
  return response.json() as Promise<Entry>
}

export async function updateEntry(
  id: number,
  entry: Omit<Entry, 'id' | 'created_at' | 'updated_at'>,
  token: string,
): Promise<Entry> {
  const response = await fetch(`/api/entries/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(entry),
  })
  if (!response.ok) {
    throw new Error(`Failed to update entry: ${response.statusText}`)
  }
  return response.json() as Promise<Entry>
}

export async function deleteEntry(id: number, token: string): Promise<void> {
  const response = await fetch(`/api/entries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(`Failed to delete entry: ${response.statusText}`)
  }
}
