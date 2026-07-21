"""scholarly/router.py — Detect academic queries + route to appropriate adapters.

Origin: STORY-154.2.

Integrates into /tech-research Phase 3 (Execute Research):
    - Detects academic signal in query (regex against domain keywords)
    - Routes to all 3 scholarly adapters in parallel
    - Aggregates results, deduplicates by DOI, ranks by citation_count
    - Falls back to standard WebSearch if no academic signal

Usage:
    from scholarly.router import detect_academic_query, search_scholarly_all

    if detect_academic_query("attention mechanism in transformers"):
        results = search_scholarly_all(query, max_per_source=10)
"""
from __future__ import annotations

import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

from .arxiv import ArxivAdapter
from .base import ScholarlyResult, SearchOptions
from .pubmed import PubMedAdapter
from .semantic_scholar import SemanticScholarAdapter


# Academic signal regex — matches if any keyword present (case-insensitive)
# Keywords cover: paper types, scholarly DBs, study designs, fields
ACADEMIC_PATTERNS = [
    r"\barxiv\b",
    r"\bpubmed\b",
    r"\bdoi\b",
    r"\bpeer.?reviewed\b",
    r"\bpeer.?review\b",
    r"\bpapers?\b",
    r"\b(systematic|meta).?(review|analysis)\b",
    r"\bRCT\b|\brandomi[sz]ed\b",
    r"\bcohort\s+(study|stud(?:ies))\b",
    r"\bcase.?control\b",
    r"\bcross.?sectional\b",
    r"\bclinical\s+trial\b",
    r"\bstud(?:y|ies)\s+on\b",
    r"\bresearch\s+(?:paper|article|literature)\b",
    r"\bscholarly\b",
    r"\bcitation",
    r"\bbibliography\b",
    r"\bmeta.?analysis\b",
    r"\bevidence.?based\b",
    r"\bbenchmark\s+paper\b",
    # Common academic field markers
    r"\bbiomedic",
    r"\bclinical\b",
    r"\bepidemiolog",
    r"\boncolog",
    r"\bneural\s+network",  # ML papers
    r"\btransformer\s+(attention|architecture|paper)",
    r"\bnatural\s+language\s+processing\b",
    r"\bmachine\s+learning\s+(?:research|paper|study)",
]
ACADEMIC_RE = re.compile("|".join(ACADEMIC_PATTERNS), re.IGNORECASE)


def detect_academic_query(query: str) -> bool:
    """Return True if query contains academic/scholarly signal."""
    if not query or not query.strip():
        return False
    return bool(ACADEMIC_RE.search(query))


def deduplicate_by_doi(results: list[ScholarlyResult]) -> list[ScholarlyResult]:
    """Dedup results by DOI (if present). When dup found, prefer result with highest citation_count."""
    by_doi: dict[str, ScholarlyResult] = {}
    no_doi: list[ScholarlyResult] = []
    for r in results:
        if r.doi:
            key = r.doi.lower().strip()
            existing = by_doi.get(key)
            if existing is None:
                by_doi[key] = r
            else:
                # Prefer Semantic Scholar (has citation count) for dedup tiebreak
                existing_cc = existing.citation_count or 0
                new_cc = r.citation_count or 0
                if new_cc > existing_cc or (new_cc == existing_cc and r.source == "semantic_scholar"):
                    by_doi[key] = r
        else:
            no_doi.append(r)
    return list(by_doi.values()) + no_doi


def rank_results(results: list[ScholarlyResult]) -> list[ScholarlyResult]:
    """Rank scholarly results.

    Strategy:
        1. Semantic Scholar (has citation count) ranked by influential_citation_count desc
        2. arXiv (recent technical) ranked by publication_date desc
        3. PubMed (biomedical) ranked by publication_date desc
        4. Items without date go last
    """
    def sort_key(r: ScholarlyResult):
        # Higher citation = better
        cc = r.citation_count or 0
        # Newer = better (use 0 if no date)
        date_score = 0
        if r.publication_date:
            try:
                year = int(r.publication_date[:4])
                date_score = year
            except (ValueError, IndexError):
                pass
        # Negative for desc sort
        return (-cc, -date_score)

    return sorted(results, key=sort_key)


def search_scholarly_all(
    query: str,
    max_per_source: int = 10,
    sources: list[str] | None = None,
    timeout: float = 30.0,
) -> list[ScholarlyResult]:
    """Search all (or specified) scholarly adapters in parallel.

    Args:
        query: search query string
        max_per_source: max results per adapter (default 10)
        sources: list of source IDs ("arxiv", "pubmed", "semantic_scholar"). None = all 3.
        timeout: max seconds to wait for all parallel requests

    Returns:
        Deduplicated, ranked list of ScholarlyResult.
    """
    if not query.strip():
        return []

    sources = sources or ["arxiv", "pubmed", "semantic_scholar"]
    adapters_map = {
        "arxiv": ArxivAdapter,
        "pubmed": PubMedAdapter,
        "semantic_scholar": SemanticScholarAdapter,
    }

    opts = SearchOptions(max_results=max_per_source, sort="relevance")

    all_results: list[ScholarlyResult] = []
    with ThreadPoolExecutor(max_workers=len(sources)) as ex:
        future_to_source = {
            ex.submit(_safe_search, adapters_map[s](), query, opts): s
            for s in sources
            if s in adapters_map
        }
        for future in as_completed(future_to_source, timeout=timeout):
            source = future_to_source[future]
            try:
                results = future.result(timeout=timeout)
                sys.stderr.write(f"[scholarly] {source}: {len(results)} results\n")
                all_results.extend(results)
            except Exception as e:
                sys.stderr.write(f"[scholarly] {source} failed: {e}\n")

    deduped = deduplicate_by_doi(all_results)
    return rank_results(deduped)


def _safe_search(adapter, query: str, opts: SearchOptions) -> list[ScholarlyResult]:
    """Wrapper that catches any exception so one failed adapter doesn't kill all."""
    try:
        return adapter.search(query, opts)
    except Exception as e:
        sys.stderr.write(f"[scholarly] {adapter.__class__.__name__} exception: {e}\n")
        return []
