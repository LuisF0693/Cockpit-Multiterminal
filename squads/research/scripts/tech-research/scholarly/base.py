"""Common interface for scholarly database adapters.

Origin: STORY-154.2 (EPIC-154).

All adapters (arXiv, PubMed, Semantic Scholar) implement `ScholarlyAdapter` ABC
to provide a uniform `search()` method returning normalized `ScholarlyResult`s.

Design rationale:
    - Pure stdlib (urllib + xml.etree) — zero external dependencies for adapters
    - Rate limit awareness is per-adapter (different policies per provider)
    - Graceful degradation: malformed responses return [] + log, never raise
    - Cite source explicitly in result.source so CITATION_GATE can verify
"""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


class RateLimitError(Exception):
    """Raised when a provider's rate limit is exhausted after retries."""


class ParseError(Exception):
    """Raised when response cannot be parsed (XML invalid, JSON malformed, schema shift)."""


@dataclass
class SearchOptions:
    """Common options accepted by all adapters. Adapters MAY ignore unsupported options."""
    max_results: int = 10
    date_range: tuple[str, str] | None = None  # (YYYY-MM-DD, YYYY-MM-DD)
    language: str | None = None  # ISO 639-1 (e.g. "en", "pt")
    sort: str = "relevance"  # "relevance" | "date_desc" | "date_asc" | "citations_desc"
    include_abstract: bool = True
    api_key: str | None = None  # provider-specific override


@dataclass
class ScholarlyResult:
    """Normalized result schema across all scholarly DBs.

    Adapter-specific fields go in `raw` (full provider response).
    Consumer code should use the typed fields; raw is for debugging.
    """
    # Core identification
    id: str                                    # provider-specific ID (e.g. arXiv "2401.12345", PMID "12345")
    title: str
    url: str                                   # canonical URL to the paper
    source: str                                # "arxiv" | "pubmed" | "semantic_scholar"

    # Bibliographic metadata
    authors: list[str] = field(default_factory=list)
    abstract: str = ""
    publication_date: str | None = None        # ISO 8601 (YYYY-MM-DD)
    venue: str | None = None                   # journal/conference name

    # Quality signals
    citation_count: int | None = None          # only Semantic Scholar provides reliably
    doi: str | None = None

    # Domain-specific (sparse, optional)
    categories: list[str] = field(default_factory=list)  # arXiv categories
    mesh_terms: list[str] = field(default_factory=list)  # PubMed MeSH

    # Provider's raw payload — for audit/debug only
    raw: dict[str, Any] = field(default_factory=dict)


class ScholarlyAdapter(ABC):
    """Abstract base class for scholarly DB adapters."""

    # Subclass MUST set these
    source_id: str = ""           # "arxiv" | "pubmed" | "semantic_scholar"
    api_base_url: str = ""        # e.g. "http://export.arxiv.org/api/query"
    rate_limit_seconds: float = 1.0  # min seconds between requests

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key
        self._last_request_at: float = 0.0

    @abstractmethod
    def search(self, query: str, opts: SearchOptions | None = None) -> list[ScholarlyResult]:
        """Search the DB and return normalized results.

        Adapters MUST:
            - Respect rate limit (call `self._throttle()` before HTTP request)
            - Return empty list on parse error (log, do not raise to caller)
            - Set `source` field to `self.source_id` on every result
            - Set `url` to canonical paper URL (not API URL)
        """

    def _throttle(self) -> None:
        """Sleep if needed to respect rate_limit_seconds since last request."""
        elapsed = time.time() - self._last_request_at
        if elapsed < self.rate_limit_seconds:
            time.sleep(self.rate_limit_seconds - elapsed)
        self._last_request_at = time.time()

    def is_available(self) -> bool:
        """Return True if adapter can run (e.g. required env vars set).

        Default: always available. Override for adapters requiring API keys.
        """
        return True

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} source={self.source_id} rate_limit={self.rate_limit_seconds}s>"


def parse_iso_date(value: str | None) -> str | None:
    """Normalize various date formats to YYYY-MM-DD ISO 8601.

    Handles:
        2024-01-15T10:30:00Z      → 2024-01-15
        2024-01-15                → 2024-01-15
        2024 Jan 15               → 2024-01-15
        Jan 2024                  → 2024-01-01
        2024                      → 2024-01-01
    """
    if not value:
        return None
    value = value.strip()

    # Try ISO 8601 first
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Try named-month formats (PubMed style)
    for fmt in ("%Y %b %d", "%Y %B %d", "%Y %b", "%Y %B"):
        try:
            dt = datetime.strptime(value, fmt)
            return dt.strftime("%Y-%m-%d") if "d" in fmt.lower() else dt.strftime("%Y-%m-01")
        except ValueError:
            continue

    # Year only
    if value.isdigit() and len(value) == 4:
        return f"{value}-01-01"

    return None
