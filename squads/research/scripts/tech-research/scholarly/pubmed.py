"""PubMed adapter — NCBI E-utilities (Entrez)

Origin: STORY-154.2.

API:
    - Two-stage: esearch (PMIDs) → efetch (full records)
    - Without API key: 3 req/sec
    - With NCBI_API_KEY env var: 10 req/sec
    - Response: XML
    - Free, supports complex queries (MeSH, author, journal, date)

Closes microdim `tri__pubmed_api_native` (AIOX 0 → ~90).
"""
from __future__ import annotations

import os
import sys
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

from .base import ScholarlyAdapter, ScholarlyResult, SearchOptions, parse_iso_date


ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"


class PubMedAdapter(ScholarlyAdapter):
    source_id = "pubmed"
    api_base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"

    def __init__(self, api_key: str | None = None):
        api_key = api_key or os.environ.get("NCBI_API_KEY")
        super().__init__(api_key=api_key)
        # Rate limit: 10/sec with key, 3/sec without
        self.rate_limit_seconds = 0.11 if api_key else 0.34

    def is_available(self) -> bool:
        # PubMed works without key but is rate-limited
        return True

    def search(self, query: str, opts: SearchOptions | None = None) -> list[ScholarlyResult]:
        opts = opts or SearchOptions()
        if not query.strip():
            return []

        # Stage 1: esearch → get PMIDs
        pmids = self._esearch(query, opts)
        if not pmids:
            return []

        # Stage 2: efetch → get full records
        return self._efetch(pmids, query)

    def _esearch(self, query: str, opts: SearchOptions) -> list[str]:
        """Get PMIDs matching query."""
        params = {
            "db": "pubmed",
            "term": query,
            "retmax": min(opts.max_results, 100),
            "retmode": "xml",
            "sort": "relevance" if opts.sort == "relevance" else "pub date",
        }
        if self.api_key:
            params["api_key"] = self.api_key

        if opts.date_range:
            start, end = opts.date_range
            params["mindate"] = start.replace("-", "/")
            params["maxdate"] = end.replace("-", "/")
            params["datetype"] = "pdat"

        url = f"{ESEARCH_URL}?{urllib.parse.urlencode(params)}"
        self._throttle()

        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                content = resp.read().decode("utf-8")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            sys.stderr.write(f"[pubmed] esearch error: {e}\n")
            return []

        try:
            root = ET.fromstring(content)
            return [e.text for e in root.findall(".//Id") if e.text]
        except ET.ParseError as e:
            sys.stderr.write(f"[pubmed] esearch parse error: {e}\n")
            return []

    def _efetch(self, pmids: list[str], original_query: str) -> list[ScholarlyResult]:
        """Fetch full records for given PMIDs."""
        params = {
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "xml",
        }
        if self.api_key:
            params["api_key"] = self.api_key

        url = f"{EFETCH_URL}?{urllib.parse.urlencode(params)}"
        self._throttle()

        try:
            with urllib.request.urlopen(url, timeout=20) as resp:
                content = resp.read().decode("utf-8")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            sys.stderr.write(f"[pubmed] efetch error: {e}\n")
            return []

        try:
            root = ET.fromstring(content)
        except ET.ParseError as e:
            sys.stderr.write(f"[pubmed] efetch parse error: {e}\n")
            return []

        results: list[ScholarlyResult] = []
        for article in root.findall(".//PubmedArticle"):
            try:
                result = self._parse_article(article)
                if result:
                    results.append(result)
            except Exception as e:
                sys.stderr.write(f"[pubmed] article parse skip: {e}\n")
                continue

        return results

    def _parse_article(self, article: ET.Element) -> ScholarlyResult | None:
        """Parse single <PubmedArticle> element."""
        pmid_elem = article.find(".//PMID")
        if pmid_elem is None or not pmid_elem.text:
            return None
        pmid = pmid_elem.text.strip()

        title_elem = article.find(".//ArticleTitle")
        title = "".join(title_elem.itertext()).strip() if title_elem is not None else ""

        # Abstract may have multiple <AbstractText> sections
        abstract_parts: list[str] = []
        for at in article.findall(".//Abstract/AbstractText"):
            label = at.get("Label")
            text = "".join(at.itertext()).strip()
            if label:
                abstract_parts.append(f"{label}: {text}")
            else:
                abstract_parts.append(text)
        abstract = " ".join(abstract_parts)

        # Authors
        authors: list[str] = []
        for au in article.findall(".//AuthorList/Author"):
            last = au.find("LastName")
            fore = au.find("ForeName")
            if last is not None and last.text:
                name = last.text.strip()
                if fore is not None and fore.text:
                    name = f"{fore.text.strip()} {name}"
                authors.append(name)

        # Date — try multiple paths
        pub_date = None
        for path in (".//PubDate", ".//DateCompleted", ".//ArticleDate"):
            pd = article.find(path)
            if pd is not None:
                y = pd.find("Year")
                m = pd.find("Month")
                d = pd.find("Day")
                if y is not None and y.text:
                    parts = [y.text]
                    if m is not None and m.text:
                        parts.append(m.text)
                    if d is not None and d.text:
                        parts.append(d.text)
                    pub_date = parse_iso_date(" ".join(parts))
                    if pub_date:
                        break

        # Journal
        venue_elem = article.find(".//Journal/Title")
        venue = venue_elem.text.strip() if venue_elem is not None and venue_elem.text else None

        # DOI
        doi = None
        for elocid in article.findall(".//ELocationID"):
            if elocid.get("EIdType") == "doi" and elocid.text:
                doi = elocid.text.strip()
                break

        # MeSH terms
        mesh: list[str] = []
        for mh in article.findall(".//MeshHeading/DescriptorName"):
            if mh.text:
                mesh.append(mh.text.strip())

        pubmed_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"

        return ScholarlyResult(
            id=pmid,
            title=title,
            url=pubmed_url,
            source=self.source_id,
            authors=authors,
            abstract=abstract,
            publication_date=pub_date,
            venue=venue,
            doi=doi,
            mesh_terms=mesh,
            raw={"pmid": pmid},
        )
