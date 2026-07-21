#!/usr/bin/env python3
"""Unit tests for scholarly adapters package.

Origin: STORY-154.2 (EPIC-154).

Tests are NETWORK-FREE — validate parsing logic + interface contracts against
fixture XML/JSON. Integration tests (real API calls) are documented in adapter
docstrings but not run in CI.

Run: python3 squads/research/scripts/tech-research/tests/test_scholarly.py
"""
from __future__ import annotations

import json
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from scholarly import (  # noqa: E402
    ArxivAdapter,
    PubMedAdapter,
    ScholarlyAdapter,
    ScholarlyResult,
    SearchOptions,
    SemanticScholarAdapter,
)
from scholarly.base import parse_iso_date  # noqa: E402
from scholarly.router import (  # noqa: E402
    deduplicate_by_doi,
    detect_academic_query,
    rank_results,
)


ARXIV_FIXTURE = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/1706.03762v5</id>
    <title>Attention Is All You Need</title>
    <summary>The dominant sequence transduction models are based on complex recurrent neural networks.</summary>
    <published>2017-06-12T17:57:34Z</published>
    <author><name>Ashish Vaswani</name></author>
    <author><name>Noam Shazeer</name></author>
    <author><name>Niki Parmar</name></author>
    <category term="cs.CL"/>
    <category term="cs.LG"/>
    <arxiv:doi>10.5555/3295222.3295349</arxiv:doi>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2401.99999v1</id>
    <title>Fake Paper</title>
    <summary>Not a real paper.</summary>
    <published>2024-01-15T00:00:00Z</published>
    <author><name>Test Author</name></author>
    <category term="cs.AI"/>
  </entry>
</feed>"""

PUBMED_EFETCH_FIXTURE = """<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>34567890</PMID>
      <Article>
        <ArticleTitle>Test Clinical Trial of Drug X</ArticleTitle>
        <Abstract>
          <AbstractText Label="BACKGROUND">Drug X is studied.</AbstractText>
          <AbstractText Label="RESULTS">Drug X works.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author><LastName>Smith</LastName><ForeName>John</ForeName></Author>
          <Author><LastName>Doe</LastName><ForeName>Jane</ForeName></Author>
        </AuthorList>
        <Journal><Title>The New England Journal of Medicine</Title></Journal>
        <ELocationID EIdType="doi">10.1056/NEJMoa2400000</ELocationID>
      </Article>
      <MeshHeadingList>
        <MeshHeading><DescriptorName>Drug X</DescriptorName></MeshHeading>
        <MeshHeading><DescriptorName>Clinical Trial</DescriptorName></MeshHeading>
      </MeshHeadingList>
    </MedlineCitation>
    <PubmedData>
      <History>
        <PubMedPubDate PubStatus="pubmed">
          <Year>2024</Year><Month>3</Month><Day>15</Day>
        </PubMedPubDate>
      </History>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>"""

S2_FIXTURE = json.dumps({
    "total": 2,
    "data": [
        {
            "paperId": "abc123",
            "title": "Attention Is All You Need",
            "abstract": "The dominant sequence transduction models.",
            "authors": [{"authorId": "a1", "name": "Ashish Vaswani"}],
            "year": 2017,
            "publicationDate": "2017-06-12",
            "venue": "NeurIPS",
            "citationCount": 95000,
            "influentialCitationCount": 12000,
            "externalIds": {"DOI": "10.5555/3295222.3295349", "ArXiv": "1706.03762"},
            "url": "https://www.semanticscholar.org/paper/abc123",
        },
        {
            "paperId": "def456",
            "title": "Lower Cited Paper",
            "abstract": "Less impact.",
            "authors": [{"authorId": "a2", "name": "Other Author"}],
            "year": 2023,
            "publicationDate": "2023-01-01",
            "venue": "Workshop",
            "citationCount": 5,
            "influentialCitationCount": 0,
            "externalIds": {},
            "url": "https://www.semanticscholar.org/paper/def456",
        },
    ],
})


class TestScholarlyBase(unittest.TestCase):

    def test_scholarly_result_default_fields(self):
        r = ScholarlyResult(id="x", title="T", url="https://x", source="arxiv")
        self.assertEqual(r.authors, [])
        self.assertEqual(r.abstract, "")
        self.assertEqual(r.categories, [])
        self.assertEqual(r.mesh_terms, [])
        self.assertIsNone(r.citation_count)

    def test_search_options_defaults(self):
        opts = SearchOptions()
        self.assertEqual(opts.max_results, 10)
        self.assertEqual(opts.sort, "relevance")
        self.assertTrue(opts.include_abstract)
        self.assertIsNone(opts.date_range)

    def test_adapter_is_abstract(self):
        with self.assertRaises(TypeError):
            ScholarlyAdapter()  # cannot instantiate ABC

    def test_parse_iso_date_iso_format(self):
        self.assertEqual(parse_iso_date("2024-01-15T10:30:00Z"), "2024-01-15")
        self.assertEqual(parse_iso_date("2024-01-15"), "2024-01-15")

    def test_parse_iso_date_year_only(self):
        self.assertEqual(parse_iso_date("2024"), "2024-01-01")

    def test_parse_iso_date_pubmed_format(self):
        self.assertEqual(parse_iso_date("2024 Jan 15"), "2024-01-15")
        self.assertEqual(parse_iso_date("2024 Jan"), "2024-01-01")

    def test_parse_iso_date_invalid(self):
        self.assertIsNone(parse_iso_date(""))
        self.assertIsNone(parse_iso_date(None))
        self.assertIsNone(parse_iso_date("not a date at all"))


class TestArxivAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = ArxivAdapter()

    def test_source_id(self):
        self.assertEqual(self.adapter.source_id, "arxiv")

    def test_rate_limit_3s(self):
        self.assertEqual(self.adapter.rate_limit_seconds, 3.0)

    def test_parse_atom_returns_results(self):
        results = self.adapter._parse_atom(ARXIV_FIXTURE, "test")
        self.assertEqual(len(results), 2)

    def test_parse_atom_first_entry_fields(self):
        results = self.adapter._parse_atom(ARXIV_FIXTURE, "test")
        r = results[0]
        self.assertEqual(r.title, "Attention Is All You Need")
        self.assertEqual(r.source, "arxiv")
        self.assertEqual(r.id, "1706.03762v5")
        self.assertEqual(r.url, "http://arxiv.org/abs/1706.03762v5")
        self.assertIn("Ashish Vaswani", r.authors)
        self.assertEqual(len(r.authors), 3)
        self.assertEqual(r.publication_date, "2017-06-12")
        self.assertEqual(r.venue, "arXiv")
        self.assertIn("cs.CL", r.categories)
        self.assertEqual(r.doi, "10.5555/3295222.3295349")

    def test_parse_malformed_xml_returns_empty(self):
        results = self.adapter._parse_atom("<not valid xml", "test")
        self.assertEqual(results, [])

    def test_empty_query_returns_empty(self):
        results = self.adapter.search("", SearchOptions())
        self.assertEqual(results, [])


class TestPubMedAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = PubMedAdapter()

    def test_source_id(self):
        self.assertEqual(self.adapter.source_id, "pubmed")

    def test_rate_limit_without_key(self):
        adapter = PubMedAdapter(api_key=None)
        self.assertGreater(adapter.rate_limit_seconds, 0.3)
        self.assertLess(adapter.rate_limit_seconds, 0.5)

    def test_rate_limit_with_key(self):
        adapter = PubMedAdapter(api_key="fake-key-for-test")
        self.assertLess(adapter.rate_limit_seconds, 0.2)

    def test_parse_article_full_fields(self):
        root = ET.fromstring(PUBMED_EFETCH_FIXTURE)
        article = root.find(".//PubmedArticle")
        r = self.adapter._parse_article(article)
        self.assertIsNotNone(r)
        self.assertEqual(r.id, "34567890")
        self.assertEqual(r.title, "Test Clinical Trial of Drug X")
        self.assertEqual(r.source, "pubmed")
        self.assertEqual(r.url, "https://pubmed.ncbi.nlm.nih.gov/34567890/")
        self.assertIn("John Smith", r.authors)
        self.assertIn("Jane Doe", r.authors)
        self.assertEqual(r.venue, "The New England Journal of Medicine")
        self.assertEqual(r.doi, "10.1056/NEJMoa2400000")
        self.assertIn("BACKGROUND", r.abstract)
        self.assertIn("RESULTS", r.abstract)
        self.assertIn("Drug X", r.mesh_terms)
        self.assertIn("Clinical Trial", r.mesh_terms)


class TestSemanticScholarAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = SemanticScholarAdapter()

    def test_source_id(self):
        self.assertEqual(self.adapter.source_id, "semantic_scholar")

    def test_rate_limit_without_key_slower(self):
        adapter = SemanticScholarAdapter(api_key=None)
        self.assertGreaterEqual(adapter.rate_limit_seconds, 1.0)

    def test_parse_paper_full_fields(self):
        data = json.loads(S2_FIXTURE)
        p = data["data"][0]
        r = self.adapter._parse_paper(p)
        self.assertEqual(r.id, "abc123")
        self.assertEqual(r.title, "Attention Is All You Need")
        self.assertEqual(r.source, "semantic_scholar")
        self.assertEqual(r.url, "https://www.semanticscholar.org/paper/abc123")
        self.assertIn("Ashish Vaswani", r.authors)
        self.assertEqual(r.publication_date, "2017-06-12")
        self.assertEqual(r.venue, "NeurIPS")
        self.assertEqual(r.citation_count, 95000)
        self.assertEqual(r.doi, "10.5555/3295222.3295349")
        self.assertEqual(r.raw["influentialCitationCount"], 12000)

    def test_parse_paper_missing_fields_safe(self):
        p = {"paperId": "x", "title": "Minimal"}
        r = self.adapter._parse_paper(p)
        self.assertEqual(r.title, "Minimal")
        self.assertEqual(r.authors, [])
        self.assertIsNone(r.publication_date)
        self.assertIsNone(r.doi)


class TestRouter(unittest.TestCase):

    def test_detect_academic_arxiv_mention(self):
        self.assertTrue(detect_academic_query("find arxiv papers on transformers"))

    def test_detect_academic_pubmed_mention(self):
        self.assertTrue(detect_academic_query("pubmed studies on glioblastoma"))

    def test_detect_academic_meta_analysis(self):
        self.assertTrue(detect_academic_query("meta-analysis of intermittent fasting"))

    def test_detect_academic_rct(self):
        self.assertTrue(detect_academic_query("RCT cancer immunotherapy"))

    def test_detect_academic_peer_reviewed(self):
        self.assertTrue(detect_academic_query("peer-reviewed evidence for X"))

    def test_detect_academic_paper_keyword(self):
        self.assertTrue(detect_academic_query("transformer attention paper"))

    def test_detect_non_academic_query(self):
        self.assertFalse(detect_academic_query("how to bake a cake"))
        self.assertFalse(detect_academic_query("best laptop 2024"))

    def test_detect_empty(self):
        self.assertFalse(detect_academic_query(""))
        self.assertFalse(detect_academic_query("   "))

    def test_deduplicate_by_doi_prefers_higher_citation(self):
        r1 = ScholarlyResult(id="a", title="X", url="u1", source="arxiv",
                             doi="10.1/x", citation_count=10)
        r2 = ScholarlyResult(id="b", title="X", url="u2", source="semantic_scholar",
                             doi="10.1/x", citation_count=500)
        result = deduplicate_by_doi([r1, r2])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].source, "semantic_scholar")
        self.assertEqual(result[0].citation_count, 500)

    def test_deduplicate_no_doi_keeps_both(self):
        r1 = ScholarlyResult(id="a", title="A", url="u1", source="arxiv")
        r2 = ScholarlyResult(id="b", title="B", url="u2", source="pubmed")
        result = deduplicate_by_doi([r1, r2])
        self.assertEqual(len(result), 2)

    def test_rank_results_by_citation_desc(self):
        rs = [
            ScholarlyResult(id="low", title="L", url="u1", source="s2", citation_count=10),
            ScholarlyResult(id="high", title="H", url="u2", source="s2", citation_count=1000),
            ScholarlyResult(id="mid", title="M", url="u3", source="s2", citation_count=100),
        ]
        ranked = rank_results(rs)
        self.assertEqual(ranked[0].id, "high")
        self.assertEqual(ranked[1].id, "mid")
        self.assertEqual(ranked[2].id, "low")

    def test_rank_results_no_citation_uses_date(self):
        rs = [
            ScholarlyResult(id="old", title="O", url="u1", source="arxiv", publication_date="2010-01-01"),
            ScholarlyResult(id="new", title="N", url="u2", source="arxiv", publication_date="2024-01-01"),
        ]
        ranked = rank_results(rs)
        self.assertEqual(ranked[0].id, "new")
        self.assertEqual(ranked[1].id, "old")


if __name__ == "__main__":
    unittest.main(verbosity=2)
