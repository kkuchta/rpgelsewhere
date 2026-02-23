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
          {' · '}
          <a
            href="https://github.com/kkuchta/rpgelsewhere/issues/new?title=Missing+or+incorrect+entry&body=The+entry+for+%3Cx%3E+should+point+to+url+%3Cy%3E+instead"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-warm-text underline transition-colors"
          >
            Missing something?
          </a>
        </p>
      )}

      <a
        href="https://github.com/kkuchta/rpgelsewhere"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 text-warm-muted hover:text-warm-text transition-colors"
        aria-label="View source on GitHub"
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
    </div>
  )
}
