# Product Discovery Framework — spy reference

> Canonical reference for the **8 product-validation protocols** that compose the `validate-product-idea` molecule and the `/tech-research --product-discovery` mode.
>
> **Source:** Distilled from the "Modelo" template (Banco de Ideias / Fase 0 — Validação Inicial e Mindset), itself a synthesis of Lean Startup (Eric Ries, 2011), The Mom Test (Rob Fitzpatrick, 2013), Jobs-To-Be-Done (Clayton Christensen, 2016), Customer Development (Steve Blank, 2005), Y Combinator + First Round Capital corpus, Sean Ellis PMF Engine, and Concierge MVP patterns (Dropbox/Airbnb/Buffer/Zappos case studies).
>
> Status: ACTIVE — Phase 1 covers protocols 1-4 (atoms shipped); Phase 2 follow-up covers 5-8.

---

## Why this framework exists

Validating a product idea well takes 2-3 intensive days. Validating it badly takes 2-3 months and produces fictional traction. The Modelo synthesizes 50+ years of validation theory into 8 sequential checks with quantitative gates — a founder who scores GO across protocols 1-4 has stronger evidence of demand than 95% of pre-seed pitches reviewed by tier-1 VCs.

The spy molecule `validate-product-idea` operationalizes the framework: each protocol becomes an atom with a reusable agent, deterministic output schema, and binary acceptance criteria. The tech-research `--product-discovery` mode operationalizes the parallel: a research dossier that *feeds* the molecule with OSINT, blue-ocean mapping, and competitive context.

---

## The 8 Protocols

### Protocol 1 — JTBD Validation (atom: `pd-jtbd-validate`)

**What it does:** Formulates and validates a Jobs-To-Be-Done statement that 80%+ of 10 target users understand without clarification.

**Framework basis:** Christensen, *Competing Against Luck* (2016) + variants in Tony Ulwick's ODI.

**Canonical format:**
> "When [situation with real data], I want [quantified motivation], so that I can [measurable outcome]."

**Quality criteria (mandatory):**
- Specific situation with numbers or proper nouns (NOT abstract context)
- Quantified motivation (% / hours / R$)
- Measurable outcome (delta in metric, not adjective)
- Free of jargon any non-technical person reads

**Validation method (mandatory):**
1. Reword the JTBD into 3 variations (short / medium / detailed)
2. Send to 10 target users via WhatsApp/LinkedIn (1-tap response)
3. Cross-check with 2nd LLM (clarity score 0-10 across 4 dimensions)

**GO threshold:** ≥80% of 10 understand on first read + at least 3 report having that exact problem.

**Agent assignment:** `sackett` (Tier 0 question formulation — PICO maps cleanly to JTBD structure)

---

### Protocol 2 — Mom Test Interviews (atom: `pd-mom-test-interview`)

**What it does:** Conducts 10+ behavioral interviews extracting *past* behavior (not future intent) about the target problem.

**Framework basis:** Fitzpatrick, *The Mom Test* (2013).

**Three Mom Test laws:**
1. Talk about their life, not your idea
2. Ask about specifics in the past, not generics about the future
3. Talk less, listen more

**Forbidden questions:** "Would you use…?" / "How much would you pay for…?" / "Would this be useful?"

**Required question form:** "Tell me about the last time…" / "Show me how you solved…" / "How much time/money did you spend on…" / "What happened when…"

**Output per interview:**
- Observed behaviors (action + frequency)
- Quantified pains (problem + real cost)
- Current hacks (what they use + why)
- Unexpected insights (discoveries not anticipated)
- Open follow-up questions

**GO threshold:** ≥10 interviews + ≥5 actionable insights + 3+ corroborated specific pains.

**Agent assignment:** `klein` (Tier 1 — NDM pattern recognition fits behavior synthesis; klein already does sensemaking)

---

### Protocol 3 — Villain Mapping (atom: `pd-villain-mapping`)

**What it does:** Maps the root cause of the unmet need through 20+ verifiable evidences from public sources.

**Framework basis:** OSINT + competitive analysis + sentiment mining from Reddit/G2/Trustpilot/X.

**Source tiers:**
- **Tier 1 (high confidence):** Reddit niche subs, G2/Capterra/Trustpilot reviews (1-3 stars), Twitter/X complaints, LinkedIn professional posts
- **Tier 2 (confirmation):** Quora/StackOverflow unresolved questions, YouTube comments on tutorials, Facebook Groups, Discord/Slack communities
- **Tier 3 (additional insight):** ProductHunt comments on competitors, HackerNews discussions, specialized forums

**Evidence record (mandatory fields):**
- Source URL (exact)
- Date posted
- Quoted problem text
- Frequency (how many agreed)
- Severity (1-10)
- Pattern category
- Screenshot link

**Pattern categories:**
- Technical failures (what breaks)
- Functional gaps (what's missing)
- UX friction (what frustrates)
- Hidden costs (what surprises)
- Structural limitations (what won't change)

**GO threshold:** ≥20 evidences + clear pattern across ≥3 tiers + identified root cause that persists despite N existing solutions.

**Agent assignment:** `bench-analyst` (Tier 1 — OSINT and source verification IS his specialty)

---

### Protocol 4 — Willingness-to-Pay Smoke Test (atom: `pd-wtp-smoke-test`)

**What it does:** Validates real payment intent (not interest) via Carrd/Framer landing + qualified traffic + conversion tracking.

**Framework basis:** Sean Ellis PMF engine + Dropbox MVT (video-before-code) + Concierge MVP (Manual-MVP from Buffer/Zappos).

**Test formats (pick 1):**
- Landing page with "Buy Now" → "Oops, not ready yet" + waitlist
- Typeform with credit card collection (no charge)
- "Early Bird" 50% off pre-sale
- Simplified crowdfunding (minimum goal)
- Paid Concierge MVP (done manually by founder)

**Copy framework:**
- HEADLINE: [Desired outcome] in [timeframe] without [main pain]
- SUBHEADLINE: [N] professionals already [related action]
- SOCIAL PROOF: specific testimonial with numbers
- PRIMARY CTA: Reserve your spot for R$[X] (limited)
- URGENCY: Only [10] early-adopter slots; price rises to R$[X] on [date]

**Funnel metrics (mandatory):**
- Unique visitors
- Time on page (>45s = interest)
- CTA clicks (>20% = copy works)
- Payment initiated (>10% = real intent)
- Data completed (>5% = strong intent)

**GO threshold:** ≥10% click-to-payment-attempt OR ≥5 confirmed pre-sales OR 3+ asking "when does it ship?"

**Agent assignment:** `gilad` (Tier 1 — competitive intel + strategic early warning maps to positioning + pricing signal detection)

---

### Protocol 5 — Hypothesis Documentation (atom: `pd-hypothesis-log`) — **PHASE 2**

**What it does:** Captures hypothesis + experiment + learnings in a Lean Startup-compliant structure that any future reader can interpret.

**Framework basis:** Eric Ries Lean Startup Build-Measure-Learn + IDEO Customer Learning Cards + Decision Journals (Annie Duke).

**Templates:**
- Hypothesis statement (We believe / If we offer / Then metric / In timeframe)
- Experiment record (type, duration, sample, method, cost, metrics)
- Insights validated / assumptions invalidated / surprises
- Decision journal (continue / pivot / stop + conviction level)
- Customer learning cards per persona

**GO threshold:** Documented hypothesis + ≥3 experiments executed + decision logged with conviction ≥7/10.

**Agent assignment (planned):** `creswell` (Tier 0 — mixed methods design + integration strategy)

---

### Protocol 6 — Community-Led Validation (atom: `pd-community-validation`) — **PHASE 2**

**What it does:** Validates idea organically across 3 relevant communities (Discord/Slack/Reddit/FB) with 20+ genuine interactions.

**Framework basis:** Community-Led Growth playbook + organic validation tactics from Figma/Notion/Webflow.

**3-phase protocol:**
1. Observation (50+ old posts read, power users mapped, language extracted)
2. Contribution (5+ answers to others, 1 useful resource, 1 relevant question)
3. Validation post (genuine problem question, NOT product pitch)

**Strong signals:**
- >20 comments in 24h
- >50 reactions/upvotes
- >5 DMs asking about solution
- Post pinned by mods
- "I NEEDED THIS YESTERDAY" responses

**GO threshold:** 3 communities × 20 interactions = 60 organic validations + 10 early adopters identified.

**Agent assignment (planned):** `bench-analyst` (reuse — community OSINT extends OSINT methodology)

---

### Protocol 7 — AI Competitive Blue Ocean Analysis (atom: `pd-ai-competitive-blue-ocean`) — **PHASE 2**

**What it does:** Uses multi-LLM (Claude + GPT + Perplexity) to map competitive landscape and identify blue-ocean quadrants in 48h.

**Framework basis:** Blue Ocean Strategy (Kim & Mauborgne) + Porter Five Forces + Wardley mapping (adapted).

**6 sub-prompts:**
1. Initial mapping (top 10 direct + top 5 indirect competitors with funding, size, pricing, differential, weakness)
2. Reviews analysis (1-3 star reviews from G2/Capterra/Trustpilot/Reddit — top complaints + missing features + churn drivers + WTP for ideal solution)
3. Positioning matrix (2x2 with axis chosen from price/complexity/value/specialization — empty quadrants = opportunity)
4. Tech stack + moats (stack, integrations, entry barriers, vulnerabilities, innovation speed)
5. GTM strategy (acquisition channels, content types, approximate CAC, sales cycle, partnerships)
6. Strategic consolidation (blue ocean identified, why it exists, how to capture, risks)

**Scorecard (50 points):**
- Gap confirmed by ≥3 sources (0-10)
- Competitors structurally can't address (0-10)
- You have unique advantage (0-10)
- Market large enough (0-10)
- Timing favorable (0-10)

**GO threshold:** Score ≥35/50.

**Agent assignment (planned):** `gilad` (reuse — competitive intel + blue ocean fit)

---

### Protocol 8 — No-Code Functional Micro-Test (atom: `pd-no-code-micro-test`) — **PHASE 2**

**What it does:** Builds a functional MVP in ≤6h using Bubble/Softr/Glide/Airtable/Webflow + Zapier; tests with 5 real people for 48h.

**Framework basis:** No-code MVP playbook from Silicon Valley pre-seed labs.

**Stack by use case:**
- Web apps: Bubble (complex) / Softr+Airtable (rapid) / Glide (mobile) / Webflow+Memberstack (login)
- Automation: Zapier/Make + Typeform / Airtable Automations / Notion + Zapier
- AI: Voiceflow (chatbots) / Levity (classification) / Obviously AI (predictions)

**6h build schedule:**
- H1: Setup + DB structure (Airtable)
- H2-3: Interface (clone template, customize copy)
- H4-5: Integrations (form→DB, trigger, email/WhatsApp response)
- H6: Tests + deploy

**Usage metrics:**
- Created account
- Completed core action
- Returned next day
- Used 3+ times
- NPS

**GO threshold:** 5 real users + ≥20% completed core action + ≥1 willing to pay.

**Agent assignment (planned):** New `pd-builder` clone agent or reuse `benchmark-runtime` worker.

---

## GO/NO-GO Composite (molecule-level)

The molecule `validate-product-idea` synthesizes the 4 atoms (Phase 1) into a composite decision:

| Score | Atoms passing | Verdict |
|---|---|---|
| **STRONG GO** | All 4 GO + WTP showed ≥1 paying | Proceed to MVP build (Fase 6 do Modelo) |
| **GO** | All 4 GO without paying customer | Proceed but treat funding as risk |
| **CONDITIONAL GO** | 3/4 GO + clear remediation for failing atom | Iterate on failing protocol, re-run |
| **NO-GO** | ≤2 GO | Pivot or kill; document learnings; do not proceed to MVP |

**Mandatory output:** decision dossier in `outputs/research/product-discovery/{run-slug}/` with:
- `decision.yaml` — verdict + evidence summary + composite score
- `01-jtbd.md` — JTBD validation report
- `02-mom-test.md` — interview synthesis
- `03-villain.md` — villain map
- `04-wtp-smoke-test.md` — smoke test results
- `metadata.yaml` — observatory contract (slug, date, coverage, status, etc.)

---

## Anti-Patterns to Reject

1. **"Founder-problem fit" skipped** — if you wouldn't lose sleep over this, you're solving someone else's problem.
2. **Future-tense validation** — "would you" / "if you" questions extract opinion, not behavior. Always past tense.
3. **Cherry-picked evidence** — 5 enthusiastic Reddit posts ≠ market signal. Use the 20-evidence floor.
4. **Interest ≠ payment** — landing page email signups validate copy, not WTP. Require credit card or pre-sale.
5. **Asking N people the same biased question** — sample size doesn't compensate for leading questions (Mom Test law 1+2).
6. **Skipping the smoke test "because we'll know once we build"** — no, you won't. WTP is the cheapest signal.
7. **Anchoring on first idea variant** — JTBD validation MUST include 3 reformulations before any user contact.

---

## References (canonical)

- Ries, *The Lean Startup* (2011)
- Blank, *The Four Steps to the Epiphany* (2005)
- Fitzpatrick, *The Mom Test* (2013)
- Christensen et al., *Competing Against Luck* (2016)
- Y Combinator Essential Startup Advice (2024)
- First Round Capital — Superhuman's PMF Engine (2018-2024)
- Kim & Mauborgne, *Blue Ocean Strategy* (2005)
- CB Insights — Startup Failure Reports

## Cross-references

- Spy atom files: `squads/research/tasks/pd-*.md`
- Spy molecule: `squads/research/tasks/validate-product-idea.md`
- Spy workflow: `squads/research/workflows/wf-product-discovery.yaml`
- Spy template: `squads/research/templates/product-discovery-report-tmpl.md`
- Spy checklist: `squads/research/checklists/product-discovery-gates.yaml`
- Companion skill: `.claude/skills/tech-research/` (mode `--product-discovery`)
- Observatory route: `/observatory/product-discovery/`
