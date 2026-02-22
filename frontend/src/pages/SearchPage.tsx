import { SearchBox } from '../components/SearchBox'
import { useEntries } from '../hooks/useEntries'
import { useSearch } from '../hooks/useSearch'

export function SearchPage() {
  const { entries, loading, error } = useEntries()
  const { query, setQuery, results, showLegacy, setShowLegacy } = useSearch(entries)

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-start pt-24 px-4">
      <div className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-5xl font-bold text-warm-text mb-2" style={{ fontFamily: 'var(--font-serif)' }}>RPG Elsewhere</h1>
        <p className="text-warm-muted text-sm">Fast D&amp;D Beyond content search</p>
      </div>

      {loading ? (
        <div className="text-warm-muted text-sm">Loading entries...</div>
      ) : error ? (
        <div className="text-center">
          <p className="text-warm-error text-sm mb-2">{error}</p>
          <p className="text-warm-muted text-xs">Run <code className="bg-warm-surface border border-warm-border rounded px-1 py-0.5">just scrape-test && just export</code> to get started.</p>
        </div>
      ) : (
        <>
          <SearchBox query={query} onQueryChange={setQuery} results={results} />
          <div className="w-full max-w-2xl mt-2 flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="show-legacy"
              checked={showLegacy}
              onChange={e => setShowLegacy(e.target.checked)}
              className="accent-[#2E2A28] cursor-pointer"
            />
            <label htmlFor="show-legacy" className="text-warm-muted text-xs cursor-pointer select-none">
              Include legacy (2014) entries
            </label>
          </div>
        </>
      )}

      {!loading && !error && !query && (
        <p className="mt-3 text-warm-muted text-xs opacity-70">
          {(showLegacy ? entries : entries.filter(e => e.edition !== 'legacy')).length.toLocaleString()} entries indexed
        </p>
      )}

    </div>
  )
}
