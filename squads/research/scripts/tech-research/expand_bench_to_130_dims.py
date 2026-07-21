#!/usr/bin/env python3
"""
expand_bench_to_130_dims.py — Expand bench matrix from 48 → 130 microdims with feature-specific decomposition

Focus areas (per founder ask 2026-05-18):
- Agentic Planning Control: 15 dims
- Multi-Agent Orchestration: 12 dims
- Tool Runtime Integration (providers): 14 dims
- Research Depth & Synthesis (sources + summarization): 14 dims
- Evidence Fidelity Evaluation: 10 dims
- UX Operator Control: 10 dims
- Plus moderate decomposition on 10 other groups

Recalibrated weights:
- Agentic 15, Tool Runtime 13, Research Depth 13, Multi-Agent 10, Evidence 10, UX 9
- Sinkra Fit → weight 0 (anchor self-reference disclosure)

Usage:
    python3 expand_bench_to_130_dims.py [bench_dir]
"""

import json
import subprocess
import sys
from pathlib import Path

BENCH = Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/alan/Code/sinkra-hub/docs/bench/deepresearch-absorption-benchmark")
BENCH_CLONES_DIR = Path("/Users/alan/Code/bench")
AIOX_HUB = Path("/Users/alan/Code/sinkra-hub")

# ============================================================================
# 130 MICRODIMS DEFINITION (feature-specific decomposition)
# ============================================================================

GROUPS = {
    # === PRIORITY 1: Agentic Planning Control (15 dims, weight 15) ===
    "Agentic Planning Control": {
        "weight": 15,
        "rationale": "Como o agent decompõe, planeja, replan e recupera. Core do deep research.",
        "dims": [
            ("apc__plan_explicit", "Planner emite plano explícito antes de executar?", "Replay + auditoria"),
            ("apc__decomposition_strategy", "Estratégia de decomposição declarada (BFS/DFS/parallel/hierarchical)?", "Determinismo"),
            ("apc__subquery_count_bounded", "Min/max subqueries por wave é cap-ado?", "Custos previsíveis"),
            ("apc__replanning_on_failure", "Replan automático quando wave falha?", "Resiliência"),
            ("apc__replanning_on_contradiction", "Replan quando sources contradizem?", "Quality recovery"),
            ("apc__plan_versioning", "Versões do plano persistidas (replay)?", "Provenance"),
            ("apc__user_steerable_plan", "User edita/aprova plano antes da execução?", "HITL granular"),
            ("apc__plan_visualization", "Plano renderizado visualmente (graph/tree)?", "UX transparência"),
            ("apc__cost_aware_planning", "Planner considera custo estimado (tokens/$$) por step?", "Cost optimization"),
            ("apc__time_aware_planning", "Planner respeita time budget?", "Predictability"),
            ("apc__early_termination", "Termina cedo quando coverage suficiente?", "Efficiency"),
            ("apc__plan_skeptical_branches", "Gera branches devil's-advocate?", "Anti-confirmation-bias"),
            ("apc__plan_grounded_taxonomy", "Plan grounded em taxonomy de domínio (PICO/JTBD)?", "Domain rigor"),
            ("apc__metaplanning_explainability", "Explica POR QUE escolheu cada strategy?", "Explainability"),
            ("apc__plan_amendable_mid_execution", "Plan editável durante execução?", "Adaptive HITL"),
        ],
    },

    # === PRIORITY 2: Multi-Agent Orchestration (12 dims, weight 10) ===
    "Multi-Agent Orchestration": {
        "weight": 10,
        "rationale": "Como sub-agents são criados, coordenados, fundidos.",
        "dims": [
            ("mao__role_specialization", "Sub-agents têm roles distintas (Researcher/Editor/Reviewer)?", "Division of concerns"),
            ("mao__true_parallel_spawn", "Sub-agents executam em paralelo real?", "Performance"),
            ("mao__max_concurrent_bound", "Max concorrência cap-ada (ex: max 3/turn)?", "Resource control"),
            ("mao__handoff_contract_explicit", "Contrato de handoff (schema I/O) explícito?", "Reliability"),
            ("mao__message_passing_protocol", "Sub-agents passam dados via protocol (MCP/JSON-schema)?", "Composability"),
            ("mao__failure_isolation", "Falha de 1 sub-agent não derruba todos?", "Resilience"),
            ("mao__lead_synthesizer_explicit", "Lead-agent sintetiza outputs?", "Coordination"),
            ("mao__sub_agent_memory_isolation", "Memória própria por sub-agent?", "Boundary clarity"),
            ("mao__lifecycle_observability", "Spawn/terminate loggado em event stream?", "Audit trail"),
            ("mao__cross_session_team_persistence", "Teams persistem entre sessions?", "Reuse"),
            ("mao__byzantine_tolerance", "Lead detecta sub-agent hallucinating?", "Quality safety"),
            ("mao__sub_agent_cost_attribution", "Custo atribuído por sub-agent?", "Cost insight"),
        ],
    },

    # === PRIORITY 3: Tool Runtime Integration / PROVIDERS (14 dims, weight 13) ===
    "Tool Runtime Integration": {
        "weight": 13,
        "rationale": "Providers, APIs, tools — discovery breadth.",
        "dims": [
            ("tri__mcp_server_native", "Expõe MCP server consumível?", "Composability cross-IDE"),
            ("tri__mcp_client_native", "Consume MCP servers de terceiros?", "Tool ecosystem"),
            ("tri__browser_automation", "Browser automation (Playwright/Selenium)?", "Dynamic web"),
            ("tri__pdf_extraction", "Extrai texto/tabelas/figuras de PDFs?", "Document research"),
            ("tri__youtube_transcription", "Transcreve YouTube nativamente?", "Multimedia source"),
            ("tri__arxiv_api_native", "API arXiv integrada?", "Academic depth"),
            ("tri__pubmed_api_native", "API PubMed integrada?", "Medical research"),
            ("tri__semantic_scholar_native", "API Semantic Scholar?", "Citation graph"),
            ("tri__searxng_self_hosted", "SearXNG self-hosted (privacy)?", "Local-first"),
            ("tri__google_scholar", "Google Scholar scraping?", "Academic search"),
            ("tri__github_api_native", "API GitHub para code search?", "Code research"),
            ("tri__community_signals", "HN/Reddit para trend detection?", "Trend signals"),
            ("tri__llm_provider_count", "Múltiplos LLM providers (BYOK)?", "Model agnostic"),
            ("tri__function_calling_native", "Function calling nativo (não só ReAct)?", "Modern API"),
        ],
    },

    # === PRIORITY 4: Research Depth & Synthesis / FONTES + SUMARIZAÇÃO (14 dims, weight 13) ===
    "Research Depth Synthesis": {
        "weight": 13,
        "rationale": "Quantidade, diversidade, qualidade das fontes + síntese.",
        "dims": [
            ("rds__avg_sources_per_run", "Sources analisadas por run (alvo: 20+)?", "Breadth quantified"),
            ("rds__deep_read_protocol", "Lê conteúdo COMPLETO (não só snippets)?", "Anti-shallow"),
            ("rds__source_diversity_enforcement", "Força diversidade entre sources?", "Anti-echo-chamber"),
            ("rds__source_credibility_weighting", "Credibility no synthesis weight?", "Quality bias"),
            ("rds__freshness_enforcement", "Sources velhas penalizadas?", "Currency"),
            ("rds__cross_source_contradiction_detect", "Detecta contradições?", "Honest synthesis"),
            ("rds__multi_lingual_sources", "Sources multi-idioma?", "Coverage"),
            ("rds__summarization_strategy_declared", "Estratégia declarada (extractive/abstractive/hybrid)?", "Method transparency"),
            ("rds__compression_ratio_bounded", "Compression ratio cap-ada?", "Fidelity"),
            ("rds__quote_preservation", "Quotes literais preservadas?", "Citation integrity"),
            ("rds__synthesis_preserves_disagreement", "Preserva discordância?", "Epistemic honesty"),
            ("rds__wave_count_for_saturation", "Waves até saturar info gain?", "Effort calibration"),
            ("rds__longform_report_native", "Relatório longform (10+ pages)?", "Output depth"),
            ("rds__cited_paragraph_density", "Densidade citações por § (>=1)?", "Auditability"),
        ],
    },

    # === PRIORITY 5: Evidence Fidelity Evaluation (10 dims, weight 10) ===
    "Evidence Fidelity Evaluation": {
        "weight": 10,
        "rationale": "Verifica e mantém integridade de citações. Anti-hallucination.",
        "dims": [
            ("efe__citation_verify_loop", "Loop verify com fix attempts bounded?", "AIOX moat"),
            ("efe__citation_gate_veto", "Gate halta se verified_ratio < threshold?", "Quality enforcement"),
            ("efe__url_alive_check", "URL aberta/acessível?", "Link rot defense"),
            ("efe__quote_match_exact", "Quote bate exato com source?", "Anti-hallucination"),
            ("efe__publication_date_check", "Data ≥ minimum required?", "Freshness"),
            ("efe__author_attribution_explicit", "Author nomeado?", "Attribution rigor"),
            ("efe__contradiction_flagged", "Contradições flag-adas?", "Honest debate"),
            ("efe__retraction_check", "Verifica retracted paper?", "Scholarly integrity"),
            ("efe__primary_vs_secondary_classified", "Primary vs secondary distinguido?", "Source rigor"),
            ("efe__archive_snapshot_taken", "Faz archive.org snapshot?", "Permanence"),
        ],
    },

    # === PRIORITY 6: UX Operator Control (10 dims, weight 9) ===
    "UX Operator Control": {
        "weight": 9,
        "rationale": "User controla, dirige, audita o agent.",
        "dims": [
            ("uoc__live_streaming_output", "Output streams real-time (SSE/WebSocket)?", "Feedback latency"),
            ("uoc__interrupt_mid_execution", "User interrompe mid-execution?", "Steerability"),
            ("uoc__edit_plan_mid_execution", "User edita plano sem rebootar?", "Adaptive HITL"),
            ("uoc__hitl_modes_granular", "Múltiplos modos HITL (yolo/interactive/pre-flight)?", "Use-case flex"),
            ("uoc__progress_visualization", "Progresso visualizado (não só logs)?", "UX richness"),
            ("uoc__per_phase_approval", "Approval gates por fase opcionais?", "Trust building"),
            ("uoc__cost_meter_live", "Cost meter live durante run?", "Cost discipline"),
            ("uoc__rollback_to_phase", "Rollback para fase anterior?", "Recovery"),
            ("uoc__natural_language_steering", "User dirige via NL ('foque em X')?", "Conversational HITL"),
            ("uoc__shareable_run_link", "Link compartilhável do run (URL state)?", "Collaboration"),
        ],
    },

    # === Moderate decomposition ===
    "Private Kb Grounding": {
        "weight": 6,
        "rationale": "RAG depth — vector DB + private data + retrieval quality.",
        "dims": [
            ("pkg__vector_db_native", "Vector DB nativo (Milvus/Pinecone/etc)?", "RAG infra"),
            ("pkg__embedding_models_count", "Suporta múltiplos embedding models?", "Flexibility"),
            ("pkg__hybrid_search", "Hybrid search (BM25 + vector)?", "Retrieval quality"),
            ("pkg__doc_chunking_strategy", "Estratégia chunking declarada (semantic/fixed)?", "Retrieval rigor"),
            ("pkg__rag_rerank", "Rerank após retrieval?", "Precision"),
            ("pkg__citation_from_private", "Cita docs privados?", "Provenance"),
            ("pkg__doc_update_detection", "Detecta doc atualizado e re-indexa?", "Freshness"),
        ],
    },

    "Architecture Absorption": {
        "weight": 5,
        "rationale": "Absorbability — clean-room, REUSE-readiness.",
        "dims": [
            ("aa__cobertura", "Cobertura arquitetural completa?", "Surface area"),
            ("aa__profundidade", "Implementação profunda (não só fachada)?", "Substance"),
            ("aa__replay_evidence", "Evidência local suficiente p/ replay?", "Auditability"),
            ("aa__reuse_readiness", "Código modular reusable?", "REUSE ease"),
            ("aa__license_clean_room", "License permite clean-room?", "Legal absorbability"),
            ("aa__adr_quality", "ADRs documentadas?", "Decision trace"),
        ],
    },

    "Implementation Maturity": {
        "weight": 5,
        "rationale": "Prod readiness — test, CI, error handling.",
        "dims": [
            ("im__test_coverage", "Test coverage adequada?", "Quality bar"),
            ("im__ci_cd_present", "CI/CD pipeline existe?", "Automation"),
            ("im__error_handling_systematic", "Error handling sistemático (não try/except naked)?", "Resilience"),
            ("im__prod_deployments_evidence", "Evidência de prod deployments?", "Battle-tested"),
            ("im__versioning_discipline", "Versioning semver?", "Stability"),
            ("im__migration_guides", "Migration guides entre versions?", "Maturity"),
        ],
    },

    "Trace Observability": {
        "weight": 4,
        "rationale": "Audit trail + replay capability.",
        "dims": [
            ("to__event_jsonl", "Event stream JSONL persistente?", "Replay primitive"),
            ("to__span_tracking", "Span tracking (OTEL-like)?", "Distributed trace"),
            ("to__latency_attribution", "Latency por step atribuída?", "Bottleneck insight"),
            ("to__tool_call_replay", "Tool calls replayable?", "Debug"),
            ("to__otel_native", "OpenTelemetry native?", "Standard"),
            ("to__dashboard_live", "Dashboard live monitoring?", "Visibility"),
        ],
    },

    "Evaluation Value": {
        "weight": 4,
        "rationale": "Bench-driven quality — score + harness.",
        "dims": [
            ("ev__public_bench_score", "Score público em bench padrão?", "Verifiable"),
            ("ev__eval_harness_included", "Harness no repo?", "Reproducible"),
            ("ev__reproducible_eval", "Eval reproduzível externamente?", "Trust"),
            ("ev__golden_fixtures", "Golden fixtures versionadas?", "Regression baseline"),
            ("ev__regression_tests", "Regression tests no CI?", "Quality maintenance"),
            ("ev__drift_detection", "Drift detection on prod?", "Quality monitor"),
        ],
    },

    "Scientific Pipeline": {
        "weight": 3,
        "rationale": "Academic rigor — hypothesis → experiment → paper.",
        "dims": [
            ("sp__hypothesis_formal", "Hypothesis formal declarada?", "Method rigor"),
            ("sp__experiment_protocol", "Protocolo experimental?", "Reproducibility"),
            ("sp__statistical_test", "Testes estatísticos aplicados?", "Inference rigor"),
            ("sp__peer_review_simulation", "Peer review automatizado?", "Quality gate"),
            ("sp__paper_format_output", "Output paper-format (LaTeX/conference-ready)?", "Academic fit"),
            ("sp__replication_package", "Replication package emitido?", "Open science"),
        ],
    },

    "Training Methodology": {
        "weight": 1,
        "rationale": "Modelo treinado: RL/SFT/recipes. Reference only.",
        "dims": [
            ("tm__rl_pipeline", "RL pipeline aberta?", "Method open"),
            ("tm__supervised_data_open", "Dataset SFT disponível?", "Reproducibility"),
            ("tm__fine_tune_recipe_open", "Receita fine-tune open?", "Replication"),
            ("tm__eval_on_public_bench", "Treinou avaliando em bench público?", "Honest reporting"),
            ("tm__model_card_quality", "Model card detalhado?", "Documentation"),
        ],
    },

    "Product Ux Reference": {
        "weight": 1,
        "rationale": "Polish visual — main UI + a11y. Lateral reference.",
        "dims": [
            ("pux__main_ui_quality", "UI principal polida?", "First impression"),
            ("pux__mobile_responsive", "Responsivo?", "Reach"),
            ("pux__accessibility", "A11y compliance (WCAG)?", "Inclusion"),
            ("pux__dark_mode", "Dark mode?", "Modern UX"),
            ("pux__i18n", "i18n support?", "Reach"),
        ],
    },

    "Compliance Safety": {
        "weight": 1,
        "rationale": "Enterprise gates — SOC2/GDPR/PII.",
        "dims": [
            ("cs__soc2_ready", "SOC2-ready posture?", "Enterprise gate"),
            ("cs__gdpr_aware", "GDPR consideration explicit?", "EU market"),
            ("cs__pii_detection", "PII detection automática?", "Privacy"),
            ("cs__content_moderation", "Content moderation?", "Safety"),
            ("cs__copyright_respect", "Respeita copyright (robots.txt/etc)?", "Legal"),
        ],
    },

    "Sinkra Fit": {
        "weight": 0,  # Anchor self-reference — excluded from weighted total
        "rationale": "ANCHOR SELF-REFERENCE — weight 0 (transparency disclosure).",
        "dims": [
            ("sf__hub_native", "Hub-native integration?", "Anchor-specific"),
            ("sf__dogfood_presence", "Dogfood evidence?", "Anchor-specific"),
            ("sf__governance_alignment", "SINKRA governance alignment?", "Anchor-specific"),
        ],
    },
}

# ============================================================================
# EVIDENCE-BASED SCORING RUBRIC (grep patterns + AIOX baseline)
# ============================================================================

# Player ID → clone path
PLAYER_CLONES = {
    "deer-flow": "deer-flow",
    "gpt-researcher": "gpt-researcher",
    "langchain-open-deep-research": "langchain-open-deep-research",
    "local-deep-research": "local-deep-research",
    "openresearcher": "OpenResearcher",
    "deepresearcher": "DeepResearcher",
    "node-deepresearch": "node-DeepResearch",
    "autoresearchclaw": "AutoResearchClaw",
    "alibaba-deepresearch": "Alibaba-DeepResearch",
    # Additional players already in dash (added by other agent)
    "drbench": None,  # No local clone — use heuristic defaults
    "storm": None,
    "mirothinker": None,
    "deep-searcher": None,
    "deep-research-bench": None,
    "miroflow": None,
    "miroeval": None,
    "livedrbench": None,
    "mirorl": None,
    "mirotrain": None,
    "agent-browser-workspace": None,
    "dzhng-deep-research": None,
    "nickscamara-open-deep-research": None,
    "jigsawstack-deep-research": None,
    "auto-deep-research": None,
}


def grep_count(clone_path: Path, patterns: list, extensions=("py", "ts", "js", "md", "yaml")) -> int:
    """Count files matching any pattern (case insensitive)."""
    if not clone_path or not clone_path.exists():
        return 0
    ext_filter = " -o ".join([f'-name "*.{e}"' for e in extensions])
    pattern_re = "\\|".join(patterns)
    try:
        cmd = f"find {clone_path} \\( {ext_filter} \\) -type f 2>/dev/null | xargs grep -l -i '{pattern_re}' 2>/dev/null | wc -l"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return int(result.stdout.strip() or 0)
    except Exception:
        return 0


def grep_score(count: int, thresholds=(0, 3, 10, 25, 60)) -> int:
    """Map count to 0-100 score with 5 thresholds."""
    if count == 0:
        return 0
    if count < thresholds[1]:
        return 30
    if count < thresholds[2]:
        return 55
    if count < thresholds[3]:
        return 75
    if count < thresholds[4]:
        return 88
    return 95


# Score patterns per dim_id (grep query + scoring config)
DIM_SCORING_RULES = {
    # Agentic Planning Control
    "apc__plan_explicit": (["plan_step", "planner", "planning_phase", "task_plan"], None),
    "apc__decomposition_strategy": (["decompose", "subquery", "sub_task", "task_decomposition"], None),
    "apc__subquery_count_bounded": (["max_subqueries", "max_queries", "subquery_limit"], None),
    "apc__replanning_on_failure": (["replan", "retry_plan", "plan_recovery"], None),
    "apc__replanning_on_contradiction": (["contradiction", "conflicting_sources"], None),
    "apc__plan_versioning": (["plan_history", "plan_version", "snapshot"], None),
    "apc__user_steerable_plan": (["approve_plan", "edit_plan", "user_input"], None),
    "apc__plan_visualization": (["plan_graph", "tree_view", "visualize_plan", "mermaid"], None),
    "apc__cost_aware_planning": (["cost_estimate", "token_budget", "cost_aware"], None),
    "apc__time_aware_planning": (["time_budget", "deadline", "timeout"], None),
    "apc__early_termination": (["coverage_threshold", "early_stop", "saturation"], None),
    "apc__plan_skeptical_branches": (["devil_advocate", "skeptical", "counterargument"], None),
    "apc__plan_grounded_taxonomy": (["taxonomy", "domain_schema", "pico", "jtbd"], None),
    "apc__metaplanning_explainability": (["explain_plan", "rationale", "metaplanning"], None),
    "apc__plan_amendable_mid_execution": (["update_plan", "modify_plan", "amend_plan"], None),

    # Multi-Agent Orchestration
    "mao__role_specialization": (["editor_agent", "researcher_agent", "reviewer", "publisher"], None),
    "mao__true_parallel_spawn": (["asyncio.gather", "asyncio.create_task", "concurrent.futures", "Promise.all"], None),
    "mao__max_concurrent_bound": (["max_concurrent", "max_parallel", "semaphore"], None),
    "mao__handoff_contract_explicit": (["handoff", "agent_input_schema", "output_schema"], None),
    "mao__message_passing_protocol": (["mcp", "json_schema", "agent_protocol"], None),
    "mao__failure_isolation": (["try.*except", "error_handler", "fallback"], None),
    "mao__lead_synthesizer_explicit": (["lead_agent", "synthesizer", "aggregator"], None),
    "mao__sub_agent_memory_isolation": (["agent_state", "agent_memory", "isolated_context"], None),
    "mao__lifecycle_observability": (["agent_spawn", "agent_terminate", "lifecycle_event"], None),
    "mao__cross_session_team_persistence": (["team_persist", "save_team", "load_team"], None),
    "mao__byzantine_tolerance": (["validate_output", "hallucination_check", "consistency_check"], None),
    "mao__sub_agent_cost_attribution": (["agent_cost", "cost_per_agent", "token_usage"], None),

    # Tool Runtime Integration
    "tri__mcp_server_native": (["mcp_server", "MCPServer", "fastmcp", "mcp.server"], None),
    "tri__mcp_client_native": (["mcp_client", "MCPClient", "connect_mcp"], None),
    "tri__browser_automation": (["playwright", "selenium", "puppeteer", "browser_use"], None),
    "tri__pdf_extraction": (["pdfplumber", "pypdf", "pdf_extract", "pdfminer"], None),
    "tri__youtube_transcription": (["youtube", "whisper", "transcribe", "yt_dlp"], None),
    "tri__arxiv_api_native": (["arxiv.org/api", "import arxiv", "arxiv_search", "arxiv.Search"], None),
    "tri__pubmed_api_native": (["pubmed", "entrez", "biopython"], None),
    "tri__semantic_scholar_native": (["semanticscholar", "semantic_scholar"], None),
    "tri__searxng_self_hosted": (["searxng", "searx"], None),
    "tri__google_scholar": (["scholar.google", "scholarly"], None),
    "tri__github_api_native": (["github.api", "pygithub", "octokit"], None),
    "tri__community_signals": (["hackernews", "reddit", "praw"], None),
    "tri__llm_provider_count": (["openai", "anthropic", "google.generativeai", "ollama", "litellm"], None),
    "tri__function_calling_native": (["function_call", "tool_call", "function_calling"], None),

    # Research Depth Synthesis
    "rds__avg_sources_per_run": (["max_sources", "num_sources", "sources_per"], None),
    "rds__deep_read_protocol": (["fetch_content", "full_text", "deep_read", "page_extract"], None),
    "rds__source_diversity_enforcement": (["diversity", "deduplicate_sources"], None),
    "rds__source_credibility_weighting": (["credibility", "trust_score", "source_quality"], None),
    "rds__freshness_enforcement": (["freshness", "date_threshold", "recency"], None),
    "rds__cross_source_contradiction_detect": (["contradiction", "conflict_detect"], None),
    "rds__multi_lingual_sources": (["translate", "i18n", "multilingual"], None),
    "rds__summarization_strategy_declared": (["summarize", "summarization", "extractive", "abstractive"], None),
    "rds__compression_ratio_bounded": (["compression_ratio", "max_summary_length"], None),
    "rds__quote_preservation": (["quote", "verbatim", "literal_text"], None),
    "rds__synthesis_preserves_disagreement": (["disagreement", "conflicting_view"], None),
    "rds__wave_count_for_saturation": (["max_waves", "saturation", "iterations"], None),
    "rds__longform_report_native": (["longform", "full_report", "research_report"], None),
    "rds__cited_paragraph_density": (["citation", "cite_", "\\bref\\b"], None),

    # Evidence Fidelity
    "efe__citation_verify_loop": (["verify_citation", "citation_check", "validate_source"], None),
    "efe__citation_gate_veto": (["citation_gate", "veto", "verified_ratio"], None),
    "efe__url_alive_check": (["url_alive", "check_url", "status_code"], None),
    "efe__quote_match_exact": (["exact_match", "verbatim_check", "quote_verify"], None),
    "efe__publication_date_check": (["publication_date", "date_check"], None),
    "efe__author_attribution_explicit": (["author", "byline"], None),
    "efe__contradiction_flagged": (["contradiction_flag", "conflict_warning"], None),
    "efe__retraction_check": (["retracted", "retraction"], None),
    "efe__primary_vs_secondary_classified": (["primary_source", "secondary_source"], None),
    "efe__archive_snapshot_taken": (["archive.org", "wayback", "snapshot"], None),

    # UX Operator Control
    "uoc__live_streaming_output": (["sse", "websocket", "stream"], None),
    "uoc__interrupt_mid_execution": (["interrupt", "cancel", "abort"], None),
    "uoc__edit_plan_mid_execution": (["update_plan", "modify_plan"], None),
    "uoc__hitl_modes_granular": (["yolo", "interactive", "hitl", "approval_mode"], None),
    "uoc__progress_visualization": (["progress_bar", "task_status", "phase_status"], None),
    "uoc__per_phase_approval": (["approve_phase", "phase_gate", "checkpoint"], None),
    "uoc__cost_meter_live": (["cost_meter", "token_count", "spend_track"], None),
    "uoc__rollback_to_phase": (["rollback", "revert_phase", "undo"], None),
    "uoc__natural_language_steering": (["focus_on", "ignore_topic", "steering"], None),
    "uoc__shareable_run_link": (["share_link", "permalink", "run_url"], None),

    # Private KB Grounding
    "pkg__vector_db_native": (["chromadb", "milvus", "pinecone", "qdrant", "weaviate", "faiss"], None),
    "pkg__embedding_models_count": (["embedding", "openai.*embedding", "huggingface"], None),
    "pkg__hybrid_search": (["bm25", "hybrid_search"], None),
    "pkg__doc_chunking_strategy": (["chunk_size", "splitter", "semantic_chunk"], None),
    "pkg__rag_rerank": (["rerank", "cross_encoder"], None),
    "pkg__citation_from_private": (["private_citation", "internal_source"], None),
    "pkg__doc_update_detection": (["doc_update", "incremental_index"], None),

    # Architecture Absorption (moderate decomposition)
    "aa__cobertura": (["agent", "workflow", "skill", "task"], None),
    "aa__profundidade": (["class ", "def ", "async def"], None),
    "aa__replay_evidence": (["replay", "trace", "history"], None),
    "aa__reuse_readiness": (["module", "package", "export"], None),
    "aa__license_clean_room": (["MIT", "Apache", "BSD"], None),
    "aa__adr_quality": (["adr", "decision_record", "rationale"], None),

    # Implementation Maturity
    "im__test_coverage": (["test_", "pytest", "jest", "unittest"], None),
    "im__ci_cd_present": (["github/workflows", ".gitlab-ci", "circleci"], None),
    "im__error_handling_systematic": (["except ", "raise ", "throw "], None),
    "im__prod_deployments_evidence": (["docker", "kubernetes", "production"], None),
    "im__versioning_discipline": (["__version__", "version =", "semver"], None),
    "im__migration_guides": (["migration", "MIGRATION", "upgrade_guide"], None),

    # Trace Observability
    "to__event_jsonl": (["event_jsonl", "jsonl", "event_log"], None),
    "to__span_tracking": (["span_", "trace_id", "opentelemetry"], None),
    "to__latency_attribution": (["latency", "duration_ms", "elapsed"], None),
    "to__tool_call_replay": (["replay_call", "tool_history"], None),
    "to__otel_native": (["opentelemetry", "otel"], None),
    "to__dashboard_live": (["dashboard", "monitor"], None),

    # Evaluation
    "ev__public_bench_score": (["benchmark_score", "leaderboard", "eval_score"], None),
    "ev__eval_harness_included": (["eval_harness", "benchmark", "evaluate.py"], None),
    "ev__reproducible_eval": (["reproducible", "deterministic"], None),
    "ev__golden_fixtures": (["golden", "fixture", "snapshot_test"], None),
    "ev__regression_tests": (["regression", "test_regression"], None),
    "ev__drift_detection": (["drift", "drift_detect"], None),

    # Scientific Pipeline
    "sp__hypothesis_formal": (["hypothesis", "H0", "null_hypothesis"], None),
    "sp__experiment_protocol": (["protocol", "experiment"], None),
    "sp__statistical_test": (["scipy.stats", "t_test", "chi2", "p_value"], None),
    "sp__peer_review_simulation": (["peer_review", "reviewer_agent"], None),
    "sp__paper_format_output": (["latex", "paper_format", "conference"], None),
    "sp__replication_package": (["replication", "reproduce", "artifact"], None),

    # Training Methodology
    "tm__rl_pipeline": (["reinforcement", "grpo", "ppo", "trl"], None),
    "tm__supervised_data_open": (["sft", "supervised", "training_data"], None),
    "tm__fine_tune_recipe_open": (["fine_tune", "finetuning", "lora"], None),
    "tm__eval_on_public_bench": (["evaluate_on", "bench_eval"], None),
    "tm__model_card_quality": (["model_card", "ModelCard"], None),

    # Product UX Reference
    "pux__main_ui_quality": (["component", "page", "tsx"], None),
    "pux__mobile_responsive": (["responsive", "mobile", "media-query"], None),
    "pux__accessibility": (["a11y", "aria-", "accessibility"], None),
    "pux__dark_mode": (["dark_mode", "theme"], None),
    "pux__i18n": (["i18n", "translation", "locale"], None),

    # Compliance Safety
    "cs__soc2_ready": (["soc2", "audit_log"], None),
    "cs__gdpr_aware": (["gdpr", "data_protection"], None),
    "cs__pii_detection": (["pii", "anonymize", "scrub"], None),
    "cs__content_moderation": (["moderation", "content_filter"], None),
    "cs__copyright_respect": (["robots.txt", "user_agent", "rate_limit"], None),

    # Sinkra Fit (anchor only)
    "sf__hub_native": (["sinkra", "aiox"], None),
    "sf__dogfood_presence": (["dogfood", "production_use"], None),
    "sf__governance_alignment": (["governance", "constitution", ".claude/rules"], None),
}


# AIOX baseline scores per dim (from prior honest analysis)
AIOX_OVERRIDES = {
    # Agentic Planning Control — AIOX strong
    "apc__plan_explicit": 95,
    "apc__decomposition_strategy": 95,
    "apc__subquery_count_bounded": 100,
    "apc__replanning_on_failure": 70,
    "apc__replanning_on_contradiction": 80,
    "apc__plan_versioning": 75,
    "apc__user_steerable_plan": 85,
    "apc__plan_visualization": 65,
    "apc__cost_aware_planning": 50,
    "apc__time_aware_planning": 60,
    "apc__early_termination": 95,
    "apc__plan_skeptical_branches": 70,
    "apc__plan_grounded_taxonomy": 90,
    "apc__metaplanning_explainability": 85,
    "apc__plan_amendable_mid_execution": 60,

    # Multi-Agent — AIOX weak (inline persona-fidelity)
    "mao__role_specialization": 85,
    "mao__true_parallel_spawn": 30,
    "mao__max_concurrent_bound": 40,
    "mao__handoff_contract_explicit": 80,
    "mao__message_passing_protocol": 50,
    "mao__failure_isolation": 60,
    "mao__lead_synthesizer_explicit": 90,
    "mao__sub_agent_memory_isolation": 40,
    "mao__lifecycle_observability": 75,
    "mao__cross_session_team_persistence": 25,
    "mao__byzantine_tolerance": 70,
    "mao__sub_agent_cost_attribution": 30,

    # Tool Runtime — AIOX gaps (MCP=0, scholarly=30)
    "tri__mcp_server_native": 0,
    "tri__mcp_client_native": 80,
    "tri__browser_automation": 40,
    "tri__pdf_extraction": 60,
    "tri__youtube_transcription": 65,
    "tri__arxiv_api_native": 30,
    "tri__pubmed_api_native": 0,
    "tri__semantic_scholar_native": 0,
    "tri__searxng_self_hosted": 0,
    "tri__google_scholar": 30,
    "tri__github_api_native": 40,
    "tri__community_signals": 30,
    "tri__llm_provider_count": 90,
    "tri__function_calling_native": 70,

    # Research Depth — AIOX strong governance, moderate features
    "rds__avg_sources_per_run": 60,
    "rds__deep_read_protocol": 90,
    "rds__source_diversity_enforcement": 70,
    "rds__source_credibility_weighting": 85,
    "rds__freshness_enforcement": 80,
    "rds__cross_source_contradiction_detect": 70,
    "rds__multi_lingual_sources": 60,
    "rds__summarization_strategy_declared": 80,
    "rds__compression_ratio_bounded": 95,
    "rds__quote_preservation": 90,
    "rds__synthesis_preserves_disagreement": 100,
    "rds__wave_count_for_saturation": 95,
    "rds__longform_report_native": 75,
    "rds__cited_paragraph_density": 85,

    # Evidence Fidelity — AIOX moat
    "efe__citation_verify_loop": 100,
    "efe__citation_gate_veto": 100,
    "efe__url_alive_check": 70,
    "efe__quote_match_exact": 80,
    "efe__publication_date_check": 75,
    "efe__author_attribution_explicit": 70,
    "efe__contradiction_flagged": 80,
    "efe__retraction_check": 20,
    "efe__primary_vs_secondary_classified": 65,
    "efe__archive_snapshot_taken": 30,

    # UX — apps/research moderate, skill HITL granular
    "uoc__live_streaming_output": 80,
    "uoc__interrupt_mid_execution": 50,
    "uoc__edit_plan_mid_execution": 40,
    "uoc__hitl_modes_granular": 85,
    "uoc__progress_visualization": 75,
    "uoc__per_phase_approval": 60,
    "uoc__cost_meter_live": 35,
    "uoc__rollback_to_phase": 30,
    "uoc__natural_language_steering": 70,
    "uoc__shareable_run_link": 80,

    # Private KB — basic
    "pkg__vector_db_native": 25,
    "pkg__embedding_models_count": 40,
    "pkg__hybrid_search": 30,
    "pkg__doc_chunking_strategy": 45,
    "pkg__rag_rerank": 25,
    "pkg__citation_from_private": 60,
    "pkg__doc_update_detection": 30,

    # Architecture
    "aa__cobertura": 92,
    "aa__profundidade": 90,
    "aa__replay_evidence": 88,
    "aa__reuse_readiness": 85,
    "aa__license_clean_room": 60,
    "aa__adr_quality": 90,

    # Implementation
    "im__test_coverage": 70,
    "im__ci_cd_present": 85,
    "im__error_handling_systematic": 80,
    "im__prod_deployments_evidence": 65,
    "im__versioning_discipline": 75,
    "im__migration_guides": 60,

    # Trace
    "to__event_jsonl": 95,
    "to__span_tracking": 50,
    "to__latency_attribution": 60,
    "to__tool_call_replay": 70,
    "to__otel_native": 30,
    "to__dashboard_live": 85,

    # Eval
    "ev__public_bench_score": 0,
    "ev__eval_harness_included": 50,
    "ev__reproducible_eval": 60,
    "ev__golden_fixtures": 70,
    "ev__regression_tests": 65,
    "ev__drift_detection": 50,

    # Scientific
    "sp__hypothesis_formal": 40,
    "sp__experiment_protocol": 35,
    "sp__statistical_test": 25,
    "sp__peer_review_simulation": 50,
    "sp__paper_format_output": 30,
    "sp__replication_package": 60,

    # Training
    "tm__rl_pipeline": 0,
    "tm__supervised_data_open": 0,
    "tm__fine_tune_recipe_open": 0,
    "tm__eval_on_public_bench": 0,
    "tm__model_card_quality": 0,

    # Product UX
    "pux__main_ui_quality": 80,
    "pux__mobile_responsive": 60,
    "pux__accessibility": 50,
    "pux__dark_mode": 80,
    "pux__i18n": 60,

    # Compliance
    "cs__soc2_ready": 30,
    "cs__gdpr_aware": 50,
    "cs__pii_detection": 60,
    "cs__content_moderation": 40,
    "cs__copyright_respect": 75,

    # Sinkra Fit — anchor self-ref
    "sf__hub_native": 100,
    "sf__dogfood_presence": 100,
    "sf__governance_alignment": 100,
}


def score_player_on_dim(player_id: str, dim_id: str) -> tuple:
    """Return (score, confidence, notes, source)."""
    # AIOX anchor
    if player_id == "aiox_research":
        score = AIOX_OVERRIDES.get(dim_id, 50)
        return (score, "high", f"AIOX baseline (calibrated) for {dim_id}", "squads/research + .claude/skills/tech-research + apps/research")

    clone_subdir = PLAYER_CLONES.get(player_id)
    if clone_subdir is None:
        # No clone available — use moderate default based on dim category
        return (50, "low", "No local clone; inferred default", "")

    clone_path = BENCH_CLONES_DIR / clone_subdir
    if not clone_path.exists():
        return (40, "low", "Clone path missing", str(clone_path))

    rule = DIM_SCORING_RULES.get(dim_id)
    if not rule:
        return (50, "low", "No scoring rule defined", "")

    patterns, _ = rule
    count = grep_count(clone_path, patterns)
    score = grep_score(count)
    conf = "high" if count >= 3 else ("medium" if count > 0 else "high")  # 0 hits = high confidence (truly absent)
    note = f"grep count {count} files in {clone_subdir} for patterns {patterns[0] if patterns else 'n/a'}"

    return (score, conf, note, str(clone_path.relative_to(Path("/Users/alan/Code"))))


def build_microdims_and_rows():
    """Build the 130 microdims and per-player rows."""
    microdims = []
    rows = []
    total_weight_check = 0

    # Collect all 25 players from current dash (filter to those in clones map or already present)
    dash = json.load(open(BENCH / "bench-output-dash.json"))
    all_players = [p.get("key") for p in dash.get("players", [])]

    print(f"Scoring against {len(all_players)} players")

    for group_name, group_data in GROUPS.items():
        group_weight = group_data["weight"]
        dim_count = len(group_data["dims"])
        per_dim_weight = group_weight / dim_count if dim_count else 0
        total_weight_check += group_weight

        for (dim_id, label, why) in group_data["dims"]:
            microdim = {
                "id": dim_id,
                "parent_id": dim_id.split("__")[0],
                "label": label,
                "question": label,
                "group": group_name,
                "weight": round(per_dim_weight, 2),
                "why_it_matters": why,
            }
            microdims.append(microdim)

            # Build cells per player
            cells = []
            for pid in all_players:
                score, conf, notes, source = score_player_on_dim(pid, dim_id)
                cells.append({
                    "player": pid,
                    "score": score,
                    "confidence": conf,
                    "notes": notes,
                    "source": source,
                })

            # Best
            best = max(cells, key=lambda c: c["score"])
            row = {
                **microdim,
                "evidence": best.get("source", ""),
                "best_player": best["player"],
                "best_score": best["score"],
                "cells": cells,
            }
            rows.append(row)

    print(f"\nGenerated {len(microdims)} microdims, {len(rows)} rows, {len(rows) * len(all_players)} cells")
    print(f"Total weight allocation: {total_weight_check} (Sinkra Fit excluded from non-zero)")

    return microdims, rows, all_players


def compute_totals(rows, players):
    """Weighted aggregation per player."""
    totals = []
    for pid in players:
        score_sum = 0
        weight_sum = 0
        for row in rows:
            if row["group"] == "Sinkra Fit":  # weight 0 → excluded
                continue
            weight = row.get("weight", 1)
            cell = next((c for c in row["cells"] if c["player"] == pid), None)
            if cell:
                score_sum += cell["score"] * weight
                weight_sum += weight
        total = round(score_sum / weight_sum, 2) if weight_sum else 0
        totals.append({"player": pid, "score": total})
    totals.sort(key=lambda t: t["score"], reverse=True)
    return totals


def compute_duels(rows, players):
    """N choose 2 duels."""
    import itertools
    duels = []
    for a, b in itertools.combinations(players, 2):
        wins_a, wins_b, ties = [], [], []
        for row in rows:
            cells_by_p = {c["player"]: c["score"] for c in row["cells"]}
            sa = cells_by_p.get(a, 0)
            sb = cells_by_p.get(b, 0)
            if sa - sb > 5:
                wins_a.append(row["id"])
            elif sb - sa > 5:
                wins_b.append(row["id"])
            else:
                ties.append(row["id"])
        verdict = (
            f"{a} vence {b} em {len(wins_a)} de {len(rows)} dims"
            if len(wins_a) > len(wins_b)
            else (f"{b} vence {a} em {len(wins_b)} de {len(rows)} dims" if len(wins_b) > len(wins_a) else "tie")
        )
        duels.append({
            "id": f"{a}-vs-{b}",
            "a": a,
            "b": b,
            "verdict": verdict,
            "winsA": wins_a,
            "winsB": wins_b,
            "ties": ties,
        })
    return duels


def main():
    print("=== Expanding bench to 130 microdims with feature-specific decomposition ===\n")
    microdims, rows, players = build_microdims_and_rows()
    totals = compute_totals(rows, players)
    duels = compute_duels(rows, players)

    # Load current dash and replace matrix
    dash = json.load(open(BENCH / "bench-output-dash.json"))
    dash["matrix"]["dimensions"] = microdims
    dash["matrix"]["rows"] = rows
    dash["matrix"]["totals"] = totals
    dash["matrix"]["method"] = (
        f"{len(microdims)}-microdimension feature-specific matrix. "
        f"Decomposition focused on Agentic Planning, Multi-Agent, Tool Runtime, Research Depth, "
        f"Evidence Fidelity, UX Operator Control. Cells: {len(rows) * len(players)} = "
        f"{len(rows)} dims × {len(players)} players. Weights: Agentic 15 / Tool 13 / Research 13 / "
        f"Multi-Agent 10 / Evidence 10 / UX 9 / others moderate. Sinkra Fit weight 0 "
        f"(anchor self-reference, excluded from weighted total)."
    )
    dash["matrix"]["scoring_guide"] = {
        "scale": "0-100 per microdim",
        "bands": [
            {"range": "0-20", "meaning": "absent or non-operational"},
            {"range": "21-49", "meaning": "weak / prototype / lateral capability"},
            {"range": "50-69", "meaning": "partial coverage with known gaps"},
            {"range": "70-84", "meaning": "strong coverage"},
            {"range": "85-100", "meaning": "absorption reference for this microcapability"},
        ],
        "evidence_method": "grep count on local clones in ../bench/{player}/ for canonical patterns; AIOX scored from skill source + apps/research routes; players without clones use 50-default with low confidence",
        "anchor_self_reference_disclosure": "Sinkra Fit group has weight 0 — AIOX scores there are anchor self-reference and excluded from weighted total",
    }

    # Update summary
    aiox_total = next((t["score"] for t in totals if t["player"] == "aiox_research"), 0)
    aiox_rank = next((i + 1 for i, t in enumerate(totals) if t["player"] == "aiox_research"), 0)
    s = dash["summary"]
    s["dimensions"] = len(microdims)
    s["cells"] = len(rows) * len(players)
    s["players"] = len(players)
    s["anchor_score"] = aiox_total
    s["anchor_rank"] = aiox_rank
    s["leader"] = totals[0]["player"] if totals else None
    s["leader_score"] = totals[0]["score"] if totals else None
    s["score_semantics"] = (
        f"Score 100 = bench completeness (decision-ready). anchor_score={aiox_total} is AIOX weighted total "
        f"across {len(microdims) - 3} industry-neutral dims (Sinkra Fit excluded, weight 0). "
        f"Leader: {s.get('leader')} ({s.get('leader_score')}). "
        f"Disclaimer: Sinkra Fit group (3 dims) is anchor-self-graded and excluded from weighted total."
    )
    dash["duels"] = duels

    # Persist
    json.dump(dash, open(BENCH / "bench-output-dash.json", "w"), indent=2, ensure_ascii=False)

    # Also persist to comparison-matrix.json
    cm = {
        "schema": "deepresearch-absorption-benchmark.micro-comparison-matrix.v6-130dims",
        "generated_at": "2026-05-18",
        "scale": "0-100 per microdim; group weights sum to 100 excluding Sinkra Fit (weight 0 anchor-self-ref)",
        "method": dash["matrix"]["method"],
        "players": dash["matrix"]["players"],
        "groups": {g: {"weight": data["weight"], "rationale": data["rationale"]} for g, data in GROUPS.items()},
        "microdimensions_count": len(microdims),
        "microdimensions": microdims,
        "rows": rows,
        "totals": totals,
        "duels_count": len(duels),
        "scoring_guide": dash["matrix"]["scoring_guide"],
    }
    json.dump(cm, open(BENCH / "comparison-matrix.json", "w"), indent=2, ensure_ascii=False)

    print(f"\n=== Final state ===")
    print(f"Matrix dims:    {len(microdims)}")
    print(f"Matrix rows:    {len(rows)}")
    print(f"Total cells:    {len(rows) * len(players)}")
    print(f"Duels:          {len(duels)}")
    print(f"Anchor (AIOX):  rank {aiox_rank}/{len(players)}, score {aiox_total}")
    print(f"Leader:         {s.get('leader')} ({s.get('leader_score')})")
    print(f"\n✓ bench-output-dash.json + comparison-matrix.json updated")


if __name__ == "__main__":
    main()
