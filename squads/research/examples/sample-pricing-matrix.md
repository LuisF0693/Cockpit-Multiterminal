# 04 - Matriz de Custos Comparativa

## Custo por Video de 5 Segundos (Marco 2026)

| Modelo | Provedor | Resolucao | Custo/5s | Loop Method | Custo Total c/ Loop |
|--------|----------|-----------|----------|-------------|---------------------|
| Wan 2.1 FLF2V | fal.ai | 480p | $0.20 | First-Last-Frame | $0.20 |
| Wan 2.1 FLF2V | fal.ai | 720p | $0.40 | First-Last-Frame | $0.40 |
| Wan 2.5 I2V | fal.ai | 480p | $0.25 | ffmpeg crossfade | $0.25 |
| Luma Ray 2 Flash | Luma API | 720p | $0.20 | Loop nativo | $0.20 |
| Runway Gen-4 Turbo | Runway | 720p | $0.25 | ffmpeg crossfade | $0.25 |
| Pika v2.2 | fal.ai | 720p | $0.20 | ffmpeg crossfade | $0.20 |
| Kling 2.5 Turbo Pro | fal.ai | 720p | $0.35 | ffmpeg crossfade | $0.35 |
| Luma Ray 2 | Luma API | 1080p | $0.50 | Loop nativo | $0.50 |
| Pika v2.2 | fal.ai | 1080p | $0.45 | ffmpeg crossfade | $0.45 |
| Kling O1 | fal.ai | 720p | $0.56 | First-Last-Frame | $0.56 |
| Runway Gen-4.5 | Runway | 1080p | $0.60 | ffmpeg crossfade | $0.60 |
| Wan Pro I2V | fal.ai | 720p | $0.80 | ffmpeg crossfade | $0.80 |
| Veo 3.1 Fast | fal.ai | 720p | $0.75 | First-Last-Frame | $0.75 |
| Runway Gen-4 Aleph | Runway | 1080p | $0.75 | ffmpeg crossfade | $0.75 |
| Veo 3.1 | Gemini API | 720p | $2.00 | First-Last-Frame | $2.00 |
| Veo 3.1 | Gemini API | 1080p | $2.00 | First-Last-Frame | $2.00 |
| Veo 3.1 | Gemini API | 4K | $2.00 | First-Last-Frame | $2.00 |

**Nota:** ffmpeg crossfade e processamento local (custo zero alem de CPU).

---

## Custo por Video de 8 Segundos

| Modelo | Resolucao | Custo/8s |
|--------|-----------|----------|
| Wan 2.1 FLF2V | 480p | $0.20 (flat) |
| Wan 2.5 I2V | 480p | $0.40 |
| Luma Ray 2 Flash | 720p | $0.20 (flat) |
| Runway Gen-4 Turbo | 720p | $0.40 |
| Kling 2.5 Turbo Pro | 720p | $0.56 |
| Kling O1 | 720p | $0.90 |
| Luma Ray 2 | 1080p | $0.50 (flat) |
| Veo 3.1 Fast | 720p | $1.20 |
| Veo 3.1 | 1080p | $3.20 |

---

## Custo para Volume (100 loops/mes)

| Modelo | Custo/Video (5s) | 100 Videos/Mes | Qualidade |
|--------|------------------|----------------|-----------|
| Wan 2.1 FLF2V 480p | $0.20 | **$20/mes** | Aceitavel |
| Luma Ray 2 Flash | $0.20 | **$20/mes** | Boa |
| Pika v2.2 720p | $0.20 | **$20/mes** | Boa |
| Runway Gen-4 Turbo | $0.25 | **$25/mes** | Boa |
| Kling 2.5 Turbo Pro | $0.35 | **$35/mes** | Muito boa |
| Kling O1 | $0.56 | **$56/mes** | Excelente |
| Luma Ray 2 | $0.50 | **$50/mes** | Boa-Excelente |
| Veo 3.1 Fast | $0.75 | **$75/mes** | Excelente |
| Veo 3.1 Standard | $2.00 | **$200/mes** | Premium |

---

## Custo de Geracao de Imagem Base (Gemini)

O pipeline completo requer uma imagem base antes do video. Com Gemini (Imagen 3):

| Modelo | Custo/imagem |
|--------|-------------|
| Gemini 2.5 Flash (image gen) | ~$0.01-0.02 |
| Gemini (Imagen 3) | ~$0.02-0.04 |

**Custo total do pipeline (imagem + video + loop):**
- Budget: $0.22 (Gemini imagem + Wan FLF2V 480p)
- Standard: $0.58 (Gemini imagem + Kling O1)
- Premium: $2.04 (Gemini imagem + Veo 3.1)

---

## Custos de Self-Hosting (Wan 2.5, open-source)

| Recurso | Custo/hora | Videos/hora | Custo/video |
|---------|-----------|-------------|-------------|
| NVIDIA A100 (cloud) | $1.50-2.00 | 20-30 | $0.05-0.10 |
| NVIDIA H100 (cloud) | $2.50-3.50 | 40-60 | $0.04-0.06 |
| GPU local (amortizado) | Variavel | Variavel | ~$0.02-0.05 |

**Nota:** Self-hosting so compensa acima de ~500 videos/mes. Abaixo disso, APIs sao mais economicas considerando setup e manutencao.

---

## Modelo de Custos Fixos (Subscriptions)

| Plataforma | Plano | Custo/Mes | Credits | Videos 5s Aprox |
|------------|-------|-----------|---------|-----------------|
| Luma Lite | Consumer | $7.99 | 3,200 | ~58 (Flash) |
| Luma Plus | Consumer | $23.99 | 10,000 | ~181 (Flash) |
| Runway Standard | Consumer | $15.00 | 625 | ~12 (Gen-4 Turbo) |
| Runway Pro | Consumer | $35.00 | 2,250 | ~45 (Gen-4 Turbo) |
| Google AI Plus | Consumer | $7.99 | Limited | ~5-10 |
| Google AI Ultra | Consumer | $249.99 | High | ~100-200 |

**Recomendacao:** Para um squad autonomo, usar APIs pay-per-use (fal.ai, Gemini API) em vez de subscriptions. Mais previsivel e escalavel.
