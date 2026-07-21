"""Scholarly DB adapters for AIOX tech-research Phase 3.

Origin: STORY-154.2 (EPIC-154 DEEPRESEARCH-ABSORPTION).
Closes Tool Runtime Integration gap (~3pt) — arXiv, PubMed, Semantic Scholar.

ADAPT pattern from local-deep-research/src/local_deep_research/search_engines/ (MIT).

Usage:
    from scholarly import ArxivAdapter, PubMedAdapter, SemanticScholarAdapter

    adapter = ArxivAdapter()
    results = adapter.search("transformer attention mechanism", max_results=10)
    for r in results:
        print(r.title, r.url)

NOTICE: This package adapts patterns (NOT code) from local-deep-research (MIT).
        See NOTICE.md for attribution.
"""
from .base import ScholarlyAdapter, ScholarlyResult, SearchOptions, RateLimitError, ParseError
from .arxiv import ArxivAdapter
from .pubmed import PubMedAdapter
from .semantic_scholar import SemanticScholarAdapter

__all__ = [
    "ScholarlyAdapter",
    "ScholarlyResult",
    "SearchOptions",
    "RateLimitError",
    "ParseError",
    "ArxivAdapter",
    "PubMedAdapter",
    "SemanticScholarAdapter",
]

__version__ = "1.0.0"
