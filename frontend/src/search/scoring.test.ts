import { describe, expect, it } from 'vitest'
import type { IndexedEntry } from '../types'
import {
  scoreCategoryBoost,
  scoreEdition,
  scoreExactMatch,
  scoreMultiWordMatch,
  scoreNameLength,
  scorePrefixMatch,
  scoreSubstringMatch,
  scoreWordStartMatch,
} from './scoring'
import { indexEntries, search } from './search'

function makeEntry(name: string, category: string = 'Spell', edition: string | null = null): IndexedEntry {
  return {
    name,
    category,
    url: `https://www.dndbeyond.com/spells/${name.toLowerCase().replace(/ /g, '-')}`,
    edition,
    nameLower: name.toLowerCase(),
    categoryLower: category.toLowerCase(),
    nameWords: name.toLowerCase().split(/\s+/),
  }
}

describe('scoreExactMatch', () => {
  it('returns 100 for exact match', () => {
    expect(scoreExactMatch('wizard', makeEntry('Wizard', 'Class'))).toBe(100)
  })

  it('returns 0 for non-match', () => {
    expect(scoreExactMatch('wizard', makeEntry('Red Wizard', 'Monster'))).toBe(0)
  })

  it('is case-insensitive via lowercased query/entry', () => {
    expect(scoreExactMatch('acid splash', makeEntry('Acid Splash'))).toBe(100)
  })
})

describe('scorePrefixMatch', () => {
  it('returns 50 for prefix match', () => {
    expect(scorePrefixMatch('fire', makeEntry('Fireball'))).toBe(50)
  })

  it('returns 0 when not a prefix', () => {
    expect(scorePrefixMatch('ball', makeEntry('Fireball'))).toBe(0)
  })
})

describe('scoreMultiWordMatch', () => {
  it('returns 40 when all query words appear in name', () => {
    expect(scoreMultiWordMatch('acid splash', makeEntry('Acid Splash'))).toBe(40)
  })

  it('returns 0 for single word query', () => {
    expect(scoreMultiWordMatch('acid', makeEntry('Acid Splash'))).toBe(0)
  })

  it('returns 0 when not all words match', () => {
    expect(scoreMultiWordMatch('acid fire', makeEntry('Acid Splash'))).toBe(0)
  })
})

describe('scoreWordStartMatch', () => {
  it('returns 30 when query matches start of any word', () => {
    expect(scoreWordStartMatch('red', makeEntry('Red Wizard'))).toBe(30)
  })

  it('matches second word', () => {
    expect(scoreWordStartMatch('wiz', makeEntry('Red Wizard'))).toBe(30)
  })

  it('returns 0 when no word starts with query', () => {
    expect(scoreWordStartMatch('xyz', makeEntry('Red Wizard'))).toBe(0)
  })
})

describe('scoreSubstringMatch', () => {
  it('returns 15 for substring match', () => {
    expect(scoreSubstringMatch('ireball', makeEntry('Fireball'))).toBe(15)
  })

  it('returns 0 for no match', () => {
    expect(scoreSubstringMatch('xyz', makeEntry('Fireball'))).toBe(0)
  })
})

describe('scoreCategoryBoost', () => {
  it('gives +10 for class', () => {
    expect(scoreCategoryBoost('wizard', makeEntry('Wizard', 'Class'))).toBe(10)
  })

  it('gives +5 for spell', () => {
    expect(scoreCategoryBoost('fireball', makeEntry('Fireball', 'Spell'))).toBe(5)
  })

  it('gives +3 for feat', () => {
    expect(scoreCategoryBoost('alert', makeEntry('Alert', 'Feat'))).toBe(3)
  })

  it('gives 0 for monster', () => {
    expect(scoreCategoryBoost('goblin', makeEntry('Goblin', 'Monster'))).toBe(0)
  })
})

describe('scoreEdition', () => {
  it('returns 0 for legacy entries', () => {
    expect(scoreEdition('fireball', makeEntry('Fireball', 'Spell', 'legacy'))).toBe(0)
  })

  it('returns 2 for non-legacy entries', () => {
    expect(scoreEdition('fireball', makeEntry('Fireball', 'Spell', null))).toBe(2)
    expect(scoreEdition('fireball', makeEntry('Fireball', 'Spell', '2024'))).toBe(2)
  })

  it('2024 entry outranks legacy entry with same base score', () => {
    const legacy = makeEntry('Fireball', 'Spell', 'legacy')
    const current = makeEntry('Fireball', 'Spell', null)
    expect(scoreEdition('fireball', current)).toBeGreaterThan(scoreEdition('fireball', legacy))
  })
})

describe('scoreNameLength', () => {
  it('penalizes short names less', () => {
    expect(scoreNameLength('', makeEntry('Fire'))).toBe(-1)
  })

  it('penalizes long names more', () => {
    expect(scoreNameLength('', makeEntry('A Very Long Name That Keeps Going And Going'))).toBe(-5)
  })
})

describe('search integration', () => {
  const rawEntries = [
    { name: 'Wizard', category: 'Class', url: 'https://www.dndbeyond.com/classes/wizard', edition: null },
    { name: 'Red Wizard', category: 'Monster', url: 'https://www.dndbeyond.com/monsters/red-wizard', edition: null },
    { name: 'Fireball', category: 'Spell', url: 'https://www.dndbeyond.com/spells/fireball', edition: null },
    { name: 'Fire Bolt', category: 'Spell', url: 'https://www.dndbeyond.com/spells/fire-bolt', edition: null },
    { name: 'Acid Splash', category: 'Spell', url: 'https://www.dndbeyond.com/spells/acid-splash', edition: null },
  ]
  const entries = indexEntries(rawEntries)

  it('"wizard" → Wizard (Class) ranks first', () => {
    const results = search('wizard', entries)
    expect(results[0].name).toBe('Wizard')
    expect(results[0].category).toBe('Class')
  })

  it('"fire" returns Fireball and Fire Bolt', () => {
    const results = search('fire', entries)
    const names = results.map(r => r.name)
    expect(names).toContain('Fireball')
    expect(names).toContain('Fire Bolt')
  })

  it('"acid splash" matches exactly', () => {
    const results = search('acid splash', entries)
    expect(results[0].name).toBe('Acid Splash')
  })

  it('empty query returns no results', () => {
    expect(search('', entries)).toHaveLength(0)
  })

  it('unmatched query returns no results', () => {
    expect(search('xyzabc', entries)).toHaveLength(0)
  })

  it('showLegacy=false excludes legacy entries', () => {
    const withLegacy = [
      { name: 'Fireball', category: 'Spell', url: 'https://www.dndbeyond.com/spells/2014/fireball', edition: 'legacy' },
      { name: 'Fireball', category: 'Spell', url: 'https://www.dndbeyond.com/spells/fireball', edition: null },
    ]
    const indexed = indexEntries(withLegacy)
    const withoutLegacyResults = search('fireball', indexed, false)
    expect(withoutLegacyResults.every(e => e.edition !== 'legacy')).toBe(true)
    expect(withoutLegacyResults).toHaveLength(1)
  })

  it('2024 entry ranks above legacy entry with same name', () => {
    const mixed = [
      { name: 'Fireball', category: 'Spell', url: 'https://www.dndbeyond.com/spells/2014/fireball', edition: 'legacy' },
      { name: 'Fireball', category: 'Spell', url: 'https://www.dndbeyond.com/spells/fireball', edition: null },
    ]
    const indexed = indexEntries(mixed)
    const results = search('fireball', indexed)
    expect(results[0].edition).not.toBe('legacy')
  })
})
