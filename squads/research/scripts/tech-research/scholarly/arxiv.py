"""arXiv adapter — http://export.arxiv.org/api/query

Origin: STORY-154.2.

API:
    - No API key required
    - Rate limit: 1 request per 3 seconds (arXiv policy)
    - Response: Atom XML (not JSON)
    - Free, unlimited use within rate limits

Closes microdim `tri__arxiv_api_native` (AIOX 30 → ~90).

ADAPT pattern from local-deep-research/src/local_deep_research/search_engines/engines/search_engine_arxiv.py (MIT).
"""
from __future__ import annotations

import sys
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

from .base import ScholarlyAdapter, ScholarlyResult, SearchOptions, ParseError, parse_iso_date


ATOM_NS = {
    "a": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}


class ArxivAdapter(ScholarlyAdapter):
    source_id = "arxiv"
    api_base_url = "http://export.arxiv.org/api/query"
    rate_limit_seconds = 3.0  # arXiv policy

    def search(self, query: str, opts: SearchOptions | None = None) -> list[ScholarlyResult]:
        opts = opts or SearchOptions()
        if not query.strip():
            return []

        # Build query — arXiv uses search_query=all:<term>
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": min(opts.max_results, 100),  # arXiv hard limit
        }

        # Sort: arXiv supports submittedDate, lastUpdatedDate, relevance
        sort_map = {
            "relevance": "relevance",
            "date_desc": "submittedDate",
            "date_asc": "submittedDate",
        }
        if opts.sort in sort_map:
            params["sortBy"] = sort_map[opts.sort]
            params["sortOrder"] = "descending" if opts.sort != "date_asc" else "ascending"

        url = f"{self.api_base_url}?{urllib.parse.urlencode(params)}"

        self._throttle()

        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                content = resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            sys.stderr.write(f"[arxiv] HTTP {e.code} for query={query[:50]}\n")
            return []
        except (urllib.error.URLError, TimeoutError) as e:
            sys.stderr.write(f"[arxiv] Network error: {e}\n")
            return []

        return self._parse_atom(content, query)

    def _parse_atom(self, content: str, original_query: str) -> list[ScholarlyResult]:
        """Parse Atom XML response into ScholarlyResult list."""
        try:
            root = ET.fromstring(content)
        except ET.ParseError as e:
            sys.stderr.write(f"[arxiv] ParseError: {e}\n")
            return []

        results: list[ScholarlyResult] = []
        for entry in root.findall("a:entry", ATOM_NS):
            try:
                result = self._parse_entry(entry)
                if result:
                    results.append(result)
            except Exception as e:
                sys.stderr.write(f"[arxiv] entry parse skip: {e}\n")
                continue

        return results

    def _parse_entry(self, entry: ET.Element) -> ScholarlyResult | None:
        """Parse a single <entry> element."""
        # arXiv ID is at the end of the <id> URL
        id_elem = entry.find("a:id", ATOM_NS)
        if id_elem is None or not id_elem.text:
            return None
        arxiv_url = id_elem.text.strip()
        arxiv_id = arxiv_url.rsplit("/", 1)[-1]  # e.g. "2401.12345v1"

        title_elem = entry.find("a:title", ATOM_NS)
        title = (title_elem.text or "").strip() if title_elem is not None else ""
        # arXiv titles have weird whitespace
        title = " ".join(title.split())

        summary_elem = entry.find("a:summary", ATOM_NS)
        abstract = (summary_elem.text or "").strip() if summary_elem is not None else ""
        abstract = " ".join(abstract.split())

        published_elem = entry.find("a:published", ATOM_NS)
        published = parse_iso_date(published_elem.text if published_elem is not None else None)

        # Authors
        authors: list[str] = []
        for author in entry.findall("a:author", ATOM_NS):
            name_elem = author.find("a:name", ATOM_NS)
            if name_elem is not None and name_elem.text:
                authors.append(name_elem.text.strip())

        # Categories (arXiv-specific)
        categories: list[str] = []
        for cat in entry.findall("a:category", ATOM_NS):
            term = cat.get("term")
            if term:
                categories.append(term)

        # DOI (when available, from arxiv namespace)
        doi_elem = entry.find("arxiv:doi", ATOM_NS)
        doi = (doi_elem.text or "").strip() if doi_elem is not None else None

        return ScholarlyResult(
            id=arxiv_id,
            title=title,
            url=arxiv_url,
            source=self.source_id,
            authors=authors,
            abstract=abstract,
            publication_date=published,
            venue="arXiv",
            doi=doi,
            categories=categories,
            raw={"arxiv_url": arxiv_url, "primary_category": categories[0] if categories else None},
        )
