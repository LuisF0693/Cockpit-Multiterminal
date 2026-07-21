#!/usr/bin/env python3
"""Research output scaffolding — creates folder structure and stub files.

Worker atom: atm_scaffold_output
Deterministic: same input = same structure. Zero LLM needed.

Ensures every research output starts with identical structure,
regardless of which model or session executes the pipeline.

Usage:
    python3 scaffold.py --slug "openrouter-best-models" --title "Best Models OpenRouter" --query "..."
    python3 scaffold.py --slug "ai-grants-gap" --title "AI Grants Gap" --query "..." --date 2026-03-28
    echo '{"slug":"...","title":"...","query":"..."}' | python3 scaffold.py --stdin
"""

import os
import sys
import json
from datetime import datetime

BASE_DIR = "docs/research"
WORKFLOW_VERSION = "1.1.0"
SCHEMA_VERSION = "research-output.v2"


def generate_readme(title: str, date: str) -> str:
    return f"""# Research: {title}

> **Data:** {date}
> **Tópico:** {title}
> **Status:** Em andamento

---

## TL;DR

{{A ser preenchido após síntese}}

---

## Research Metadata

```yaml
workflow_version: "{WORKFLOW_VERSION}"
runtime_contract:
  workflow_version: "{WORKFLOW_VERSION}"
  schema_version: "{SCHEMA_VERSION}"
  skill_version: "1.0.0"
  tool_contract_version: "manual"
coverage_score: 0
coverage_breakdown:
  fundamentals: 0
  implementation: 0
  comparison: 0
  best_practices: 0
  real_world: 0
  current_state: 0
integrity_score: N/A
stop_reason: "in_progress"
citation_verified: false
rubrics:
  information_recall:
    passed: 0
    total: 0
  analysis:
    passed: 0
    total: 0
  presentation:
    passed: 0
    total: 0
sources:
  total: 0
  high_credibility: 0
  medium_credibility: 0
  with_dates: 0
  freshness_ratio: 0%
waves: 0
```

---

## Índice

| # | Arquivo | Descrição |
|---|---------|-----------|
| 00 | [query-original.md](./00-query-original.md) | Pergunta inicial e contexto |
| 01 | [deep-research-prompt.md](./01-deep-research-prompt.md) | Prompt estruturado |
| 02 | [research-report.md](./02-research-report.md) | Relatório completo |
| 03 | [recommendations.md](./03-recommendations.md) | Recomendações finais |
| - | [quick-wins.md](./quick-wins.md) | Quick Wins ROI-first (alto valor + S/XS effort + ttv ≤ 1 semana) |
| - | [curiosity_queue.yaml](./curiosity_queue.yaml) | Perguntas abertas e decisões de investigação |
| - | [evolving_report.md](./evolving_report.md) | Estado Markoviano operacional |
| - | [execution-log.jsonl](./execution-log.jsonl) | Log determinístico mínimo por fase |

---

## Referências Principais

{{A ser preenchido após pesquisa}}
"""


def generate_query(query: str, date: str) -> str:
    return f"""# Query Original

> **Data:** {date}

## Pergunta Original

> "{query}"

## Contexto Inferido

- **Foco:** {{a ser preenchido}}
- **Tecnologias:** {{a ser preenchido}}
- **Temporal:** {{a ser preenchido}}

## Sub-Queries Decompostas

{{A ser preenchido após decomposição}}
"""


def generate_deep_prompt_stub(date: str) -> str:
    return f"""# Deep Research Prompt

> **Gerado em:** {date}

## Prompt Utilizado

{{A ser preenchido após Phase 2}}

## Sub-Queries Decompostas

{{A ser preenchido após Phase 1.5}}
"""


def generate_report_stub(title: str, date: str) -> str:
    return f"""# {title}

> **Relatório de Pesquisa** | {date}
> **Coverage:** 0/100 | **Sources:** 0

---

## Executive Summary

{{A ser preenchido após síntese}}

---

## Stop Reason

{{A ser preenchido no encerramento da pesquisa}}

---

{{Conteúdo do relatório será gerado pelo pipeline}}
"""


def generate_recommendations_stub(date: str) -> str:
    return f"""# Recomendações

> **Data:** {date}
> **Baseado em:** [02-research-report.md](./02-research-report.md)

---

## Decisão Recomendada

{{A ser preenchido após síntese}}

---

## Ranking de Alternativas

| # | Solução | Score | Effort | Quando Usar | Justificativa |
|---|---------|-------|--------|-------------|---------------|
{{A ser preenchido}}

---

## Implementation Roadmap

| Fase | Ação | Effort | Owner | Timeline |
|------|------|--------|-------|----------|
{{A ser preenchido}}

---

## Anti-Patterns

| O que NÃO fazer | Por quê | Consequência |
|------------------|---------|--------------|
{{A ser preenchido}}

---

## Próximos Passos

> **IMPORTANTE:** Este documento é apenas pesquisa. Para implementação:
> - **@pm** para priorização e criação de stories
> - **@dev** para execução técnica

{{A ser preenchido}}
"""


def generate_quick_wins_stub(date: str) -> str:
    return f"""# Quick Wins

> **Data:** {date}
> **Baseado em:** [02-research-report.md](./02-research-report.md) + [03-recommendations.md](./03-recommendations.md)
> **Critério:** alto valor + S/XS effort (≤8h) + time-to-value ≤ 1 semana

---

## TL;DR

{{A ser preenchido após Phase 4 (Synthesize) — extração do subset ROI-first}}

---

## Quick Wins Selecionados

| # | Quick Win | Target | Tipo | Value | Effort | Time-to-Value | Evidência | Owner |
|---|-----------|--------|------|-------|--------|---------------|-----------|-------|
| QW-1 | {{...}} | {{path}} | squad\\|app\\|skill\\|agent\\|runner\\|rule\\|workflow\\|adr\\|doc | high | XS\\|S | <1d\\|<3d\\|<1wk | §X.Y de `02-research-report.md` | @owner |
| QW-2 | {{...}} | {{...}} | {{...}} | high | XS\\|S | <1wk | {{...}} | @owner |
| QW-3 | {{...}} | {{...}} | {{...}} | high | XS\\|S | <1wk | {{...}} | @owner |

---

## Detalhamento por Quick Win

### QW-1 — {{nome}}

- **O quê:** {{...}}
- **Onde:** {{caminho exato no hub}}
- **Por que é alto valor:** {{...}}
- **Por que é baixo esforço:** {{...}}
- **Evidência no report:** §{{X.Y}}
- **Definition of Done:** {{...}}
- **Riscos:** {{...}}
- **Owner sugerido:** @{{owner}}

### QW-2 — {{nome}}

(mesma estrutura)

### QW-3 — {{nome}}

(mesma estrutura)

---

## Próximo Passo

> Para cada QW selecionado:
> - **@pm** prioriza e cria story em `docs/stories/`
> - **@dev** ou owner correspondente executa
"""


def generate_curiosity_queue(date: str) -> str:
    return f"""mission_date: "{date}"
items: []
"""


def generate_evolving_report(title: str, date: str) -> str:
    return f"""# Evolving Report — {title}

> **Data:** {date}
> **Status:** in_progress

## Current Synthesis

{{A ser preenchido após cada wave. Este arquivo substitui o estado operacional anterior.}}

## Open Questions

{{A ser preenchido a partir de curiosity_queue.yaml}}

## Stop Readiness

```yaml
can_stop: false
stop_reason: "in_progress"
blocking_open_questions: []
```
"""


def generate_execution_log(date: str, slug: str) -> str:
    return json.dumps({
        "ts": datetime.now().isoformat(),
        "event": "scaffold_created",
        "pipeline_id": f"{date}-{slug}",
        "workflow_version": WORKFLOW_VERSION,
    }, ensure_ascii=False) + "\n"


def scaffold(slug: str, title: str, query: str, date: str = None) -> dict:
    """Create research output folder with all stub files."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    folder_name = f"{date}-{slug}"
    folder_path = os.path.join(BASE_DIR, folder_name)

    os.makedirs(folder_path, exist_ok=True)

    files = {
        "README.md": generate_readme(title, date),
        "00-query-original.md": generate_query(query, date),
        "01-deep-research-prompt.md": generate_deep_prompt_stub(date),
        "02-research-report.md": generate_report_stub(title, date),
        "03-recommendations.md": generate_recommendations_stub(date),
        "quick-wins.md": generate_quick_wins_stub(date),
        "curiosity_queue.yaml": generate_curiosity_queue(date),
        "evolving_report.md": generate_evolving_report(title, date),
        "execution-log.jsonl": generate_execution_log(date, slug),
    }

    created = []
    skipped = []
    for filename, content in files.items():
        filepath = os.path.join(folder_path, filename)
        if os.path.exists(filepath):
            skipped.append(filename)
        else:
            with open(filepath, "w") as f:
                f.write(content)
            created.append(filename)

    return {
        "folder": folder_path,
        "date": date,
        "slug": slug,
        "title": title,
        "created": created,
        "skipped": skipped,
        "total_files": len(files),
    }


def main():
    if "--stdin" in sys.argv:
        data = json.loads(sys.stdin.read())
        result = scaffold(
            slug=data["slug"],
            title=data["title"],
            query=data["query"],
            date=data.get("date"),
        )
        print(json.dumps(result, indent=2))
        return

    slug = None
    title = None
    query = None
    date = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--slug" and i + 1 < len(args):
            slug = args[i + 1]
            i += 2
        elif args[i] == "--title" and i + 1 < len(args):
            title = args[i + 1]
            i += 2
        elif args[i] == "--query" and i + 1 < len(args):
            query = args[i + 1]
            i += 2
        elif args[i] == "--date" and i + 1 < len(args):
            date = args[i + 1]
            i += 2
        else:
            i += 1

    if not slug or not title or not query:
        print("Usage: scaffold.py --slug <slug> --title <title> --query <query> [--date YYYY-MM-DD]", file=sys.stderr)
        print("   or: echo '{json}' | scaffold.py --stdin", file=sys.stderr)
        sys.exit(1)

    result = scaffold(slug=slug, title=title, query=query, date=date)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
