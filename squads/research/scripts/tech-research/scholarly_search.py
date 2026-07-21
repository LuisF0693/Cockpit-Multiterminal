"""
scholarly_search.py — Pure-Python bridge to scholarly DB adapters for /tech-research Phase 3.

Adapters: arXiv (MIT), PubMed/Entrez (MIT), Semantic Scholar (MIT).
ADAPT pattern from local-deep-research (MIT) — attribution in packages/@sinkra/research-adapters/NOTICE.txt.

Usage (called from phase-3-execute-research.yaml academic signal branch):
  python3 squads/research/scripts/tech-research/scholarly_search.py \
      --query "transformer attention mechanism" \
      --adapters arxiv pubmed semantic_scholar \
      --max-results 5

Output: JSON to stdout, one line per result.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import Optional


# ── arXiv ─────────────────────────────────────────────────────────────────────

ARXIV_API = "http://export.arxiv.org/api/query"
ARXIV_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}


def arxiv_search(query: str, max_results: int = 5) -> list[dict]:
    params = urllib.parse.urlencode({
        "search_query": f"all:{query}",
        "max_results": max_results,
        "sortBy": "relevance",
    })
    url = f"{ARXIV_API}?{params}"

    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            xml_data = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code in (429, 503):
            print(f"[scholarly_search] arXiv rate limit ({e.code}) — skipping", file=sys.stderr)
            return []
        raise
    except Exception as e:
        print(f"[scholarly_search] arXiv fetch error: {e}", file=sys.stderr)
        return []

    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        print(f"[scholarly_search] arXiv XML parse error: {e}", file=sys.stderr)
        return []

    results = []
    for entry in root.findall("atom:entry", ARXIV_NS):
        id_el = entry.find("atom:id", ARXIV_NS)
        raw_id = id_el.text if id_el is not None else ""
        arxiv_id = raw_id.split("/abs/")[-1] if "/abs/" in raw_id else raw_id

        title_el = entry.find("atom:title", ARXIV_NS)
        title = (title_el.text or "").strip() if title_el is not None else ""

        summary_el = entry.find("atom:summary", ARXIV_NS)
        abstract = (summary_el.text or "").replace("\n", " ").strip() if summary_el is not None else None

        authors = [
            (a.find("atom:name", ARXIV_NS).text or "").strip()
            for a in entry.findall("atom:author", ARXIV_NS)
            if a.find("atom:name", ARXIV_NS) is not None
        ]

        published_el = entry.find("atom:published", ARXIV_NS)
        published = published_el.text if published_el is not None else None

        pdf_url = None
        for link in entry.findall("atom:link", ARXIV_NS):
            if link.get("type") == "application/pdf":
                pdf_url = link.get("href")
                break

        categories = [c.get("term", "") for c in entry.findall("atom:category", ARXIV_NS)]

        results.append({
            "id": arxiv_id,
            "arxiv_id": arxiv_id,
            "title": title,
            "authors": authors,
            "abstract": abstract,
            "publication_date": published,
            "pdf_url": pdf_url,
            "categories": categories,
            "source": "arxiv",
        })

    return results


# ── PubMed ────────────────────────────────────────────────────────────────────

ENTREZ_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PUBMED_EMAIL = os.environ.get("PUBMED_EMAIL", "research@sinkra.ai")
NCBI_API_KEY: Optional[str] = os.environ.get("NCBI_API_KEY")


def _pubmed_params(extra: dict) -> str:
    params = {"tool": "sinkra-research", "email": PUBMED_EMAIL}
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY
    params.update(extra)
    return urllib.parse.urlencode(params)


def _fetch_json(url: str) -> Optional[dict]:
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[scholarly_search] HTTP error {url}: {e}", file=sys.stderr)
        return None


def _fetch_text(url: str) -> Optional[str]:
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            return resp.read().decode("utf-8")
    except Exception as e:
        print(f"[scholarly_search] HTTP error {url}: {e}", file=sys.stderr)
        return None


def pubmed_search(query: str, max_results: int = 5) -> list[dict]:
    esearch_url = f"{ENTREZ_BASE}/esearch.fcgi?{_pubmed_params({'db':'pubmed','term':query,'retmode':'json','retmax':max_results,'usehistory':'y'})}"
    esearch_data = _fetch_json(esearch_url)
    if not esearch_data:
        return []

    pmids = esearch_data.get("esearchresult", {}).get("idlist", [])
    if not pmids:
        return []

    esummary_url = f"{ENTREZ_BASE}/esummary.fcgi?{_pubmed_params({'db':'pubmed','id':','.join(pmids),'retmode':'json','rettype':'summary'})}"
    summary_data = _fetch_json(esummary_url)
    if not summary_data:
        return []

    result_map = summary_data.get("result", {})

    efetch_url = f"{ENTREZ_BASE}/efetch.fcgi?{_pubmed_params({'db':'pubmed','id':','.join(pmids),'retmode':'xml','rettype':'abstract'})}"
    abstract_xml = _fetch_text(efetch_url) or ""

    abstracts: dict[str, str] = {}
    try:
        root = ET.fromstring(abstract_xml) if abstract_xml else None
        if root is not None:
            for article in root.findall(".//PubmedArticle"):
                pmid_el = article.find(".//PMID")
                pmid = pmid_el.text if pmid_el is not None else None
                if not pmid:
                    continue
                parts = []
                for ab_el in article.findall(".//AbstractText"):
                    label = ab_el.get("Label")
                    text = (ab_el.text or "").strip()
                    if text:
                        parts.append(f"{label}: {text}" if label else text)
                if parts:
                    abstracts[pmid] = "\n\n".join(parts)
    except ET.ParseError:
        pass

    results = []
    for pmid in pmids:
        article = result_map.get(pmid)
        if not article:
            continue

        doi = article.get("doi") or next(
            (a["value"] for a in article.get("articleids", []) if a.get("idtype") == "doi"), None
        )

        results.append({
            "id": pmid,
            "pmid": pmid,
            "title": article.get("title", ""),
            "authors": [a["name"] for a in article.get("authors", [])],
            "abstract": abstracts.get(pmid),
            "publication_date": article.get("pubdate"),
            "journal": article.get("fulljournalname"),
            "doi": doi,
            "source": "pubmed",
        })

    return results


# ── Semantic Scholar ───────────────────────────────────────────────────────────

SS_SEARCH = "https://api.semanticscholar.org/graph/v1/paper/search"
SS_FIELDS = "paperId,title,abstract,authors,year,citationCount,influentialCitationCount,externalIds,openAccessPdf,publicationDate"
SS_API_KEY: Optional[str] = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")


def semantic_scholar_search(query: str, max_results: int = 5) -> list[dict]:
    params = urllib.parse.urlencode({
        "query": query,
        "limit": min(max_results, 100),
        "fields": SS_FIELDS,
    })
    url = f"{SS_SEARCH}?{params}"

    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    if SS_API_KEY:
        req.add_header("x-api-key", SS_API_KEY)

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print("[scholarly_search] Semantic Scholar rate limit — skipping", file=sys.stderr)
            return []
        raise
    except Exception as e:
        print(f"[scholarly_search] Semantic Scholar error: {e}", file=sys.stderr)
        return []

    results = []
    for paper in data.get("data", []):
        ext = paper.get("externalIds") or {}
        pdf_info = paper.get("openAccessPdf")

        results.append({
            "id": paper.get("paperId", ""),
            "paper_id": paper.get("paperId", ""),
            "title": paper.get("title", ""),
            "authors": [a["name"] for a in (paper.get("authors") or [])],
            "abstract": paper.get("abstract"),
            "publication_date": paper.get("publicationDate") or (str(paper["year"]) if paper.get("year") else None),
            "year": paper.get("year"),
            "citation_count": paper.get("citationCount"),
            "influential_citation_count": paper.get("influentialCitationCount"),
            "pdf_url": pdf_info["url"] if pdf_info else None,
            "doi": ext.get("DOI"),
            "source": "semantic_scholar",
        })

    return results


# ── CLI ────────────────────────────────────────────────────────────────────────

ADAPTER_MAP = {
    "arxiv": arxiv_search,
    "pubmed": pubmed_search,
    "semantic_scholar": semantic_scholar_search,
}

ACADEMIC_SIGNAL_PATTERN = (
    r"arxiv|pubmed|paper|study|trial|cohort|systematic.?review|"
    r"meta.?analysis|peer.?reviewed|doi|pmid|preprint|journal|"
    r"cite|citation|literature|evidence.?based|rct|clinical|biomedical"
)


def has_academic_signal(query: str) -> bool:
    import re
    return bool(re.search(ACADEMIC_SIGNAL_PATTERN, query, re.IGNORECASE))


def main():
    parser = argparse.ArgumentParser(description="Scholarly DB search bridge for /tech-research Phase 3")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--adapters", nargs="+", default=["arxiv", "pubmed", "semantic_scholar"],
                        choices=list(ADAPTER_MAP.keys()), help="Which adapters to use")
    parser.add_argument("--max-results", type=int, default=5, help="Max results per adapter")
    parser.add_argument("--check-signal", action="store_true",
                        help="Exit 1 if query has no academic signal (gate mode)")
    parser.add_argument("--delay-between", type=float, default=1.0,
                        help="Seconds to wait between adapter calls")
    args = parser.parse_args()

    if args.check_signal and not has_academic_signal(args.query):
        print(json.dumps({"signal": False, "results": []}))
        return

    all_results = []
    for adapter_name in args.adapters:
        fn = ADAPTER_MAP[adapter_name]
        try:
            results = fn(args.query, args.max_results)
            all_results.extend(results)
        except Exception as e:
            print(f"[scholarly_search] {adapter_name} error: {e}", file=sys.stderr)
        if len(args.adapters) > 1:
            time.sleep(args.delay_between)

    print(json.dumps({"signal": True, "results": all_results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
