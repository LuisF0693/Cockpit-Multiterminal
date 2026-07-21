# Task: Quick Player Analysis

```yaml
id: quick-analysis
name: "Quick Player Analysis"
category: analysis
agent: research-chief
elicit: true
autonomous: false
type: atom
description: "8-minute player analysis with engagement metrics and pattern extraction"
```

## Contrato SINKRA

Domain: `Operational`

task: quickAnalysis()
responsavel: spy
responsavel_type: Agent
atomic_layer: Atom
Entrada:
- `handle`
- `platform`
Saida:
- artefatos em `outputs/research/`
Inputs: ver bloco `Entrada`
Outputs: ver bloco `Saida`
Pre-conditions: ver `pre_condition`
Post-conditions: ver `post_condition`
Performance: ver `performance`
Error Handling: ver `error_handling`

Checklist:
- `checklists/content-creation-checklist.md`
pre_condition: evidências mínimas carregadas e subject validado
post_condition: artefato persistido com achados e próximos passos rastreáveis
performance: falhar alto, registrar fontes e manter consistência entre evidências e relatório
error_handling: "on_fail: HALT phase, preserve partial artifacts, log failure context"

**Task ID:** quick-analysis
**Version:** 2.0.0
**Status:** active
**Responsible Executor:** Agent (@research-chief)
**Execution Type:** Agent
**Model:** Haiku (fast analysis, structured output)
**Haiku Eligible:** YES - straightforward data extraction and formatting

## Input
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | YouTube channel or Instagram handle |
| `platform` | enum | Yes | `youtube` or `instagram` |

## Output
| Artifact | Location | Description |
|----------|----------|-------------|
| Quick Report | `outputs/research/{platform}/{handle}-{date}.md` | Analysis summary |

## Veto Conditions
- STOP if no API access (check credentials first)
- STOP if channel/profile not found
- STOP if no public content available

## Acceptance Criteria
- [ ] Top 5 content pieces identified
- [ ] Engagement rates calculated
- [ ] 3+ patterns identified
- [ ] 3+ actionable insights provided
- [ ] Report saved to outputs/research/

---

## Objective
Quickly analyze a channel/profile and extract actionable insights.

## Workflow

### 1. Data Collection (2 min)
```bash
# YouTube
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={ID}&type=video&maxResults=10&order=viewCount&key=$YOUTUBE_API_KEY"

# Instagram (via Graph API)
curl "https://graph.facebook.com/v18.0/{user_id}/media?fields=id,caption,like_count,comments_count,media_type&access_token=$META_ACCESS_TOKEN"
```

### 2. Analysis (3 min)
- [ ] Identify top 5 by views/engagement
- [ ] Extract title patterns
- [ ] Calculate average engagement rate
- [ ] Map recurring themes

### 3. Synthesis (2 min)
- [ ] 3 main insights
- [ ] 3 patterns to replicate
- [ ] 1 gap/opportunity

### 4. Output (1 min)
Save to: `outputs/research/{platform}/{handle}-{date}.md`

## Total Time: ~8 minutes

---

## Template Binding

Render o output usando o template registrado `templates/player-analysis-tmpl.md`.
Se precisar reduzir para modo rápido, mantenha a mesma estrutura-base do template e apenas compacte o conteúdo.
Mantenha explicitamente os blocos de métricas, padrões, insights e ações replicáveis previstos no template.

---

## Post-Analysis Checklist

- [ ] Report saved to outputs/research/
- [ ] Insights shared
- [ ] Player added to monitoring list

---

*Quick Analysis Task v2.0*

Completion Criteria: artefato concluído, validado contra checklist e pronto para handoff ou publish

---

accountability:
  accountable: "Human (Process Owner)"
  responsible: "research-chief"
  consulted: [research-chief]
  informed: [research-operator]
