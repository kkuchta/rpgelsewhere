export interface Entry {
  name: string
  category: string
  url: string
  edition: string | null
}

export interface IndexedEntry extends Entry {
  nameLower: string
  categoryLower: string
  nameWords: string[]
}
