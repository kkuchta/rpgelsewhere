import { Link } from 'react-router-dom'
import { SearchBox } from '../components/SearchBox'
import { useEntries } from '../hooks/useEntries'
import { useSearch } from '../hooks/useSearch'

export function SearchPage() {
  const { entries, loading, error } = useEntries()
  const { query, setQuery, results } = useSearch(entries)

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-start pt-24 px-4">
      <div className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">RPG Elsewhere</h1>
        <p className="text-gray-400 text-sm">Fast D&amp;D Beyond content search</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading entries...</div>
      ) : error ? (
        <div className="text-red-400 text-sm">Error: {error}</div>
      ) : (
        <SearchBox query={query} onQueryChange={setQuery} results={results} />
      )}

      {!loading && !error && !query && (
        <p className="mt-4 text-gray-600 text-xs">
          {entries.length.toLocaleString()} entries indexed
        </p>
      )}

      <Link
        to="/admin"
        className="fixed bottom-4 right-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        Admin
      </Link>
    </div>
  )
}
