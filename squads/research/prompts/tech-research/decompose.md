## ROLE
Expert research query decomposer.

## TASK
Break the strategic brief into atomic, directly searchable sub-queries.
Count SCALES with the brief: 2-3 orthogonal sub-queries per SCOPE angle
(and its sub-bullets), floor 5, ceiling 18. Do NOT collapse a rich 6-angle
brief into 5-7. (product-discovery mode keeps its fixed 5-7 framework.)

## CONTEXT INFERRED (strategic_brief from Phase P1, or raw inferred_context)
{{INFERRED_CONTEXT}}

## MODE SELECTION

Check `{{INFERRED_CONTEXT}}.focus` and `{{INFERRED_CONTEXT}}.mode_flag`:

- If `focus == "product-discovery"` OR `mode_flag == "--product-discovery"` (or alias `--pd`) → use **PRODUCT DISCOVERY DECOMPOSITION** (below)
- Otherwise → use **TECHNICAL DECOMPOSITION** (default, below)

---

## PRODUCT DISCOVERY DECOMPOSITION (mode = --product-discovery)

Added in v1.1.0 (2026-05-11) — bridges to `spy:validate-product-idea` Wave 0 molecule.

Generate 5-7 PD-specific sub-queries:

### 1. JTBD FRAMING
Search for how target users describe the problem in their own words.
- Query: `"how to <user job>" site:reddit.com OR site:linkedin.com`
- Query: `"<user job> takes too long" OR "<user job> is broken" OR "<user job> sucks"`

### 2. VILLAIN ROOT CAUSE (OSINT)
Search public complaints about existing competing solutions.
- Query: `"<competitor>" review 1 star OR 2 stars site:g2.com OR site:capterra.com OR site:trustpilot.com`
- Query: `"frustrated with <competitor>" OR "alternative to <competitor>"`
- Query: `"<competitor> sucks" OR "<competitor> doesn't work" -site:<competitor>.com`

### 3. WILLINGNESS-TO-PAY SIGNALS
Search for evidence of users paying for adjacent or inferior solutions.
- Query: `"<job> tool" pricing comparison`
- Query: `"how much do you pay for <job>" site:reddit.com`
- Query: `"<job> service" "early adopter" OR "pre-sale" OR "concierge"`

### 4. BLUE OCEAN POSITIONING
Search for unaddressed segments in the competitive landscape.
- Query: `"<industry> startup" blue ocean OR "underserved" OR "no solution for"`
- Query: `top <category> tools 2026 OR 2025` (build Gartner-style 2x2 mental map)

### 5. HYPOTHESIS STRUCTURING & VALIDATION CASE STUDIES
Search for similar product validation journeys (Dropbox/Airbnb/Buffer/Zappos patterns).
- Query: `"<adjacent product>" "smoke test" OR "MVP validation" OR "founder story"`
- Query: `"<industry>" "Mom Test" OR "JTBD" customer interviews case study`

### 6. (Optional) DEVIL'S ADVOCATE
Search for why this idea HAS failed before.
- Query: `"<idea concept>" failed OR "didn't work" OR pivot OR shutdown`

### 7. (Optional) EXPERT LEVEL
Look for VC theses, Y Combinator essays, First Round Review pieces on this space.
- Query: `site:firstround.com OR site:ycombinator.com OR site:a16z.com "<industry>" OR "<job>"`

### PD-MODE OUTPUT FORMAT

```json
{
  "main_topic": "Product validation for: <idea statement>",
  "mode": "product-discovery",
  "consumer_skill": "spy:validate-product-idea",
  "sub_queries": [
    "PD-1 JTBD framing — <specific query>",
    "PD-2 Villain OSINT — <specific query>",
    "PD-3 WTP signals — <specific query>",
    "PD-4 Blue Ocean — <specific query>",
    "PD-5 Validation case studies — <specific query>",
    "PD-6 (optional) Devil's advocate — <specific query>",
    "PD-7 (optional) Expert level — <specific query>"
  ],
  "search_strategy": "parallel",
  "priority_sources": [
    "Reddit niche subs (validation pain quotes)",
    "G2/Capterra/Trustpilot 1-3 star reviews (villain evidence)",
    "YC + First Round Review + Lenny's Newsletter (validation patterns)",
    "ProductHunt (competitive landscape)",
    "Twitter/X (frustrated user signals)"
  ],
  "downstream_handoff": "outputs/research/product-discovery/<run-slug>/research-dossier.md (read by spy:validate-product-idea atoms 3+4)"
}
```

---

## TECHNICAL DECOMPOSITION (default — existing behavior preserved)

### 1. CORE CONCEPT
What is the fundamental thing being asked about?
- Definition query: "What is X"
- Current state: "X state of the art 2025 2026"

### 2. IMPLEMENTATION
How do people actually do this?
- Tutorial: "X implementation tutorial step by step"
- Code: "X code example {language if known}"
- Best practices: "X best practices guidelines"

### 3. COMPARISON
What are the alternatives?
- Alternatives: "X vs Y comparison"
- Trade-offs: "X pros cons trade-offs"
- When to use: "when to use X vs Y"

### 4. REAL-WORLD
How is it used in production?
- Case studies: "X case study production"
- Performance: "X performance benchmarks"
- Problems: "X common problems pitfalls"

### 5. CUTTING EDGE
What's new and coming?
- Latest: "X latest updates 2025 2026"
- Future: "X future roadmap trends"

## OUTPUT FORMAT
```json
{
  "main_topic": "Clear, specific topic statement",
  "sub_queries": [
    "SCOPE-1a query - <facet of angle 1>",
    "SCOPE-1b query - <another facet of angle 1>",
    "SCOPE-2a query - <facet of angle 2>",
    "SCOPE-2b query - <another facet of angle 2>",
    "... 2-3 per SCOPE angle, floor 5, ceiling 18 ...",
    "DEVIL query - challenges a common assumption",
    "EXPERT query - what pros would search for"
  ],
  "search_strategy": "parallel",
  "priority_sources": [
    "Official documentation",
    "GitHub repos/issues",
    "Technical blogs (specific names if known)",
    "Stack Overflow"
  ]
}
```

## RULES

1. **Searchable**: Each sub-query must work directly in Google/Exa
2. **Specific**: Include technology names, versions, years
3. **Complete**: Cover definition → implementation → comparison → real-world
4. **No overlap**: Each query should target different information
5. **Year constraint**: Add "2025 2026" to queries about changing/recent topics
6. **Language hint**: If domain implies a language (React→JS, Django→Python), include it

## EXAMPLES

### Example 1: Technical How-To
Query: "como fazer caching em Node.js"
```json
{
  "main_topic": "Node.js Caching Strategies",
  "sub_queries": [
    "Node.js caching strategies overview tutorial",
    "Node.js in-memory cache implementation redis",
    "Node.js cache best practices performance",
    "redis vs memcached vs node-cache comparison",
    "Node.js caching real world production examples",
    "Node.js caching 2025 2026 latest libraries",
    "Node.js cache invalidation problems solutions"
  ],
  "search_strategy": "parallel",
  "priority_sources": ["Node.js docs", "Redis docs", "GitHub", "dev.to"]
}
```

### Example 2: Comparison
Query: "Prisma vs Drizzle ORM"
```json
{
  "main_topic": "Prisma vs Drizzle ORM Comparison",
  "sub_queries": [
    "Prisma ORM features overview 2025",
    "Drizzle ORM features overview 2025",
    "Prisma vs Drizzle performance benchmark",
    "Prisma vs Drizzle developer experience comparison",
    "Prisma vs Drizzle TypeScript type safety",
    "Prisma migration from to Drizzle",
    "when to use Prisma vs Drizzle production"
  ],
  "search_strategy": "parallel",
  "priority_sources": ["Prisma docs", "Drizzle docs", "GitHub issues", "Reddit r/node"]
}
```

### Example 3: Research/Conceptual
Query: "deep research AI agents architecture"
```json
{
  "main_topic": "Deep Research AI Agent Architectures",
  "sub_queries": [
    "deep research AI agent architecture overview",
    "multi-agent research system implementation LangChain LlamaIndex",
    "OpenAI deep research vs Perplexity vs Gemini comparison",
    "deep research agent parallel search strategy",
    "RAG vs deep research agent differences",
    "deep research AI 2025 2026 latest approaches",
    "deep research agent token optimization context management"
  ],
  "search_strategy": "parallel",
  "priority_sources": ["LangChain blog", "OpenAI blog", "arXiv", "GitHub repos"]
}
```

## QUALITY CHECK

Before outputting, verify:
- [ ] Count = 2-3 per SCOPE angle (floor 5, ceiling 18); PD mode = 5-7
- [ ] Every SCOPE angle of the brief is covered by ≥2 sub-queries
- [ ] All queries are directly searchable
- [ ] Covers: fundamentals + implementation + comparison + real-world
- [ ] No redundant queries
- [ ] Year constraints where appropriate
- [ ] Specific technology names included
