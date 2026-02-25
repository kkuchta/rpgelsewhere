# SRD Completeness Evaluation

## Overview

`backend/scripts/evaluate_completeness.py` compares our `entries.json` against the official 5th Edition SRD data to identify gaps in our dataset.

```bash
just check-completeness

# Optional flags:
uv run python -m scripts.evaluate_completeness --edition legacy   # only compare legacy entries
uv run python -m scripts.evaluate_completeness \
    --entries path/to/entries.json                                # custom entries path
```

## Data source

The script fetches raw JSON from [5e-bits/5e-database](https://github.com/5e-bits/5e-database) on GitHub. This repo is a community-maintained, hand-curated transcription of the [D&D 5th Edition SRD](https://dnd.wizards.com/resources/systems-reference-document), served by [dnd5eapi.co](https://www.dnd5eapi.co/).

The SRD is the subset of D&D 5e content that Wizards of the Coast released under the Open Game License (OGL), making it freely usable by third parties. It covers roughly the Player's Handbook core content — 319 spells, 334 monsters, all 12 base classes (with one subclass each), the 9 PHB races, and a broad set of equipment and magic items.

The API exposes both `/api/2014/` (full SRD) and `/api/2024/` endpoints, but the 2024 path only has reference data (conditions, languages, skills, equipment) — none of the main categories like spells, monsters, or classes. The script uses the 2014 SRD files for all comparisons.

## What the output tells you

- **SRD coverage %**: The fraction of SRD entries that appear (by name) in our dataset. Since the SRD is a strict subset of D&D Beyond content, missing SRD entries are definite gaps.
- **"Missing" list**: Entries in the SRD that are absent from our data by normalized name match. These fall into a few buckets:

  1. **Truly missing** — content our scraper hasn't found yet (e.g., rare monsters, equipment that isn't prominently crawled).
  2. **SRD name differs from D&D Beyond name** — the SRD strips proper names from spells (e.g., "Acid Arrow" instead of "Melf's Acid Arrow", "Arcane Hand" instead of "Bigby's Hand"). These show up as "missing" even though we have the D&D Beyond version.
  3. **SRD variants** — the SRD sometimes lists monster forms separately (e.g., "Vampire, Bat Form", "Werewolf, Hybrid Form") that don't have distinct D&D Beyond pages.
  4. **Equipment granularity** — the SRD lists things like barding by armor type, saddle variants, and animal feed that D&D Beyond may not have as dedicated pages.

## Coverage notes (as of initial run)

| Category   | Covered | SRD Total | Notes |
|------------|---------|-----------|-------|
| Spell      | 275     | 319       | ~44 missing; mostly SRD-renamed spells (Melf's, Bigby's, etc.) |
| Monster    | 220     | 334       | ~114 missing; many are common creatures + monster form variants |
| Class      | 9       | 12        | Fighter, Monk, Ranger not yet in dataset |
| Subclass   | 0       | 12        | Subclasses not well-indexed by Common Crawl yet |
| Species    | 3       | 9         | Several core races missing |
| Equipment  | 76      | 237       | Many mundane items + vehicles + barding not crawled |
| Magic Item | 183     | 362       | Variants (e.g., "+1/+2/+3" listings) inflate the SRD count |
| Feat       | 1       | 1         | 100% |
| Background | 1       | 1         | 100% |

The SRD is an imperfect reference for categories like Equipment and Magic Items due to variant-listing inflation. Spells and Monsters are the most actionable signals.
