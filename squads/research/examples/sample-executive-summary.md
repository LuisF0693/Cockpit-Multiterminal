# Deep Research: Video Background Loops com IA (Marco 2026)

## Executive Summary

Pesquisa tecnica profunda sobre o estado da arte em geracao de video loops seamless com IA para uso em websites. Cobre modelos, APIs, tecnicas de loop, custos e pipeline recomendado.

**Classificacao:** UC-001 (Technical Deep Dive) + UC-002 (Strategic Decision Support)

**Confianca geral:** ALTA (baseada em documentacao oficial de APIs, pricing publico, e testes documentados por terceiros)

---

## Findings Principais

1. **Luma Ray 2 e o unico modelo com parametro `loop: true` nativo na API.** Todos os outros requerem tecnicas auxiliares (first-last-frame ou ffmpeg post-processing).

2. **Veo 3.1 suporta first-frame + last-frame via Gemini API**, permitindo loops seamless ao passar a mesma imagem como primeiro e ultimo frame. Qualidade cinematografica superior, mas custo alto ($0.40/s).

3. **Kling O1 (fal.ai) e a melhor relacao custo-qualidade para loops.** Suporta dual-keyframe (mesma imagem = loop perfeito) a $0.112/s com qualidade cinematografica excelente.

4. **Wan 2.1 FLF2V (fal.ai) e a opcao open-source mais barata** para first-last-frame a $0.20-0.40/video, mas qualidade inferior aos modelos proprietarios.

5. **Pipeline recomendado:** Gemini (imagem) -> Kling O1 ou Veo 3.1 (video com first=last frame) -> ffmpeg crossfade polish -> ffmpeg web optimization (H.264/VP9, <2MB).

6. **Custo por loop de 5s:** Desde $0.20 (Wan) ate $2.00 (Veo 3.1 4K). Sweet spot: Kling O1 a ~$0.56 por 5s.

---

## Indice dos Relatorios

| Arquivo | Conteudo |
|---------|----------|
| `01-models-comparison.md` | Comparacao detalhada de todos os modelos de video |
| `02-loop-techniques.md` | Tecnicas de loop: first-last-frame, crossfade, nativo |
| `03-api-reference.md` | Referencia de APIs: endpoints, parametros, code samples |
| `04-pricing-matrix.md` | Matriz de custos comparativa |
| `05-pipeline-recommendation.md` | Pipeline end-to-end recomendado para o squad |
| `06-sources.md` | Todas as fontes consultadas |

---

**Pesquisa conduzida em:** 2026-03-23
**Modelo:** Claude Opus 4.6 (1M context)
**Pipeline:** DR Orchestrator > UC-001 + UC-002 > Synthesis
