export interface Entry {
  id: number
  name: string
  category: string
  url: string
  edition: string | null
  created_at: string
  updated_at: string
}

export interface IndexedEntry extends Entry {
  nameLower: string
  categoryLower: string
  nameWords: string[]
}
