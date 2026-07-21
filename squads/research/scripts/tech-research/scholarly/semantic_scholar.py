"""Semantic Scholar adapter — Allen AI's academic graph API

Origin: STORY-154.2.

API:
    - Endpoint: https://api.semanticscholar.org/graph/v1/paper/search
    - Without API key: 100 req per 5 min
    - With SEMANTIC_SCHOLAR_API_KEY env var: 1 req/sec sustained
    - Response: JSON (much simpler than arXiv/PubMed XML)
    - Bonus: citation graph + influential citation count

Closes microdim `tri__semantic_scholar_native` (AIOX 0 → ~90).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

from .base import ScholarlyAdapter, ScholarlyResult, SearchOptions, parse_iso_date


SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search"


class SemanticScholarAdapter(ScholarlyAdapter):
    source_id = "semantic_scholar"
    api_base_url = "https://api.semanticscholar.org/graph/v1/"
    # Fields we want from the API response (uses field-selection to minimize payload)
    DEFAULT_FIELDS = [
        "paperId",
        "title",
        "abstract",
        "authors",
        "year",
        "publicationDate",
        "venue",
        "citationCount",
        "influentialCitationCount",
        "externalIds",
        "url",
    ]

    def __init__(self, api_key: str | None = None):
        api_key = api_key or os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
        super().__init__(api_key=api_key)
        # Rate: 1/sec with key, slower without (we use 3/sec conservative without key)
        self.rate_limit_seconds = 1.0 if api_key else 3.0

    def search(self, query: str, opts: SearchOptions | None = None) -> list[ScholarlyResult]:
        opts = opts or SearchOptions()
        if not query.strip():
            return []

        params = {
            "query": query,
            "limit": min(opts.max_results, 100),
            "fields": ",".join(self.DEFAULT_FIELDS),
        }
        if opts.date_range:
            start, end = opts.date_range
            # Semantic Scholar uses year only in publicationDateOrYear filter
            try:
                params["year"] = f"{start[:4]}-{end[:4]}"
            except Exception:
                pass

        url = f"{SEARCH_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url)
        if self.api_key:
            req.add_header("x-api-key", self.api_key)
        req.add_header("User-Agent", "AIOX-Research/1.0 (research@alanicolas.com)")

        self._throttle()

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                sys.stderr.write("[semantic-scholar] rate limited (429). Consider SEMANTIC_SCHOLAR_API_KEY.\n")
            else:
                sys.stderr.write(f"[semantic-scholar] HTTP {e.code}\n")
            return []
        except (urllib.error.URLError, TimeoutError) as e:
            sys.stderr.write(f"[semantic-scholar] Network error: {e}\n")
            return []

        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            sys.stderr.write(f"[semantic-scholar] JSON parse error: {e}\n")
            return []

        papers = data.get("data", [])
        return [self._parse_paper(p) for p in papers if p]

    def _parse_paper(self, p: dict) -> ScholarlyResult:
        paper_id = p.get("paperId", "")
        title = (p.get("title") or "").strip()
        abstract = (p.get("abstract") or "").strip()
        venue = (p.get("venue") or "").strip() or None
        citation_count = p.get("citationCount")

        # Authors: list of {authorId, name}
        authors: list[str] = []
        for a in p.get("authors", []) or []:
            name = (a.get("name") or "").strip()
            if name:
                authors.append(name)

        # Date: prefer publicationDate, fallback year
        date_str = p.get("publicationDate")
        if not date_str and p.get("year"):
            date_str = str(p["year"])
        pub_date = parse_iso_date(date_str)

        # DOI from externalIds
        doi = None
        ext = p.get("externalIds") or {}
        if isinstance(ext, dict):
            doi = ext.get("DOI") or None

        # Canonical URL: prefer paper URL, fallback API URL
        url = p.get("url") or f"https://www.semanticscholar.org/paper/{paper_id}"

        return ScholarlyResult(
            id=paper_id,
            title=title,
            url=url,
            source=self.source_id,
            authors=authors,
            abstract=abstract,
            publication_date=pub_date,
            venue=venue,
            citation_count=citation_count,
            doi=doi,
            raw={
                "paperId": paper_id,
                "influentialCitationCount": p.get("influentialCitationCount"),
                "externalIds": ext,
            },
        )
