# Scholarly Adapters — NOTICE & License Attribution

**Origin:** STORY-154.2 (EPIC-154 DEEPRESEARCH-ABSORPTION).
**Date:** 2026-05-18

## Pattern Source

The structural patterns (adapter interface, rate limiting policy, two-stage PubMed search,
field selection in Semantic Scholar) were adapted from:

- **local-deep-research** by LearningCircuit, MIT License
  - URL: https://github.com/LearningCircuit/local-deep-research
  - Source paths inspected (read-only):
    - `src/local_deep_research/search_engines/engines/search_engine_arxiv.py`
    - `src/local_deep_research/search_engines/engines/search_engine_pubmed.py`
    - `src/local_deep_research/search_engines/engines/search_engine_semantic_scholar.py`
  - License: MIT (https://github.com/LearningCircuit/local-deep-research/blob/main/LICENSE)

## What Was Adapted (NOT copied)

- The pattern of common interface with `search(query, opts) -> list[Result]`
- The two-stage `esearch → efetch` flow for PubMed
- The field-selection idea for Semantic Scholar (minimize payload)
- Rate limit policies per provider (3s arXiv, 0.34s PubMed without key, 1s SemanticScholar with key)

## What Was Written From Scratch

- `ScholarlyResult` dataclass and `ScholarlyAdapter` ABC
- All XML parsing for arXiv and PubMed (using stdlib `xml.etree.ElementTree`)
- All HTTP code using stdlib `urllib.request` (no external deps)
- `_throttle()` time-based rate limit logic
- `parse_iso_date()` date normalization utility
- `scholarly/router.py` — academic query detection + parallel dispatch + dedup + ranking
- Tests in `tests/test_scholarly.py`

## License of AIOX Adapters

These adapter files (`base.py`, `arxiv.py`, `pubmed.py`, `semantic_scholar.py`,
`router.py`, `__init__.py`) are part of Sinkra Hub and follow the repository's
overall license. They are independently authored code that follows the public
patterns described above; no code was copied from the original sources.

## API Terms of Use Compliance

| Provider | Terms link | AIOX compliance |
|---|---|---|
| arXiv | https://info.arxiv.org/help/api/tou.html | 3s/request enforced; User-Agent identifies AIOX |
| PubMed (NCBI E-utilities) | https://www.ncbi.nlm.nih.gov/books/NBK25497/ | Respects 3/sec (no key) / 10/sec (with key) |
| Semantic Scholar | https://www.semanticscholar.org/product/api | Respects rate limit 100/5min (no key) / 1/sec (with key) |

Operators must obtain their own API keys for higher rate tiers:
- `NCBI_API_KEY` — https://www.ncbi.nlm.nih.gov/account/settings/
- `SEMANTIC_SCHOLAR_API_KEY` — https://www.semanticscholar.org/product/api#api-key-form

## Versioning

- Adapter version: 1.0.0 (matches `__init__.py:__version__`)
- Last verified compatibility: 2026-05-18 against current API responses
