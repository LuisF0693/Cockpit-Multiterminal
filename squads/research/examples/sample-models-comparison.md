# 01 - Comparacao de Modelos de Video IA (Marco 2026)

## Panorama Geral

O mercado de geracao de video por IA em marco de 2026 oferece 10+ modelos viáveis para image-to-video via API. Para o caso de uso especifico de **video background loops para websites**, os criterios criticos sao:

1. Suporte a image-to-video (i2v)
2. Capacidade de loop seamless (nativo ou via first-last-frame)
3. Qualidade cinematografica do movimento
4. Custo por geracao
5. Resolucao e duracao

---

## Tier S: Melhor Qualidade Cinematografica

### Google Veo 3.1

- **Provedor:** Google (Gemini API / Vertex AI)
- **Modelo:** `veo-3.1-generate-preview`
- **I2V:** Sim (image como first frame)
- **First-Last-Frame:** Sim (parametro `lastFrame` no config)
- **Loop nativo:** Nao (mas first=last frame produz loop seamless)
- **Resolucao:** 720p, 1080p, 4K
- **Duracao:** 4s, 6s, 8s
- **Audio:** Gerado nativamente junto com video
- **Qualidade:** A mais alta do mercado para realismo, estabilidade de movimento, agua, fogo, particulas. "Closest thing to true AI cinematography."
- **Custo:** $0.40/segundo (standard), $0.15/segundo (Fast)
- **Latencia:** 11 segundos a 6 minutos
- **Watermark:** SynthID (invisivel)
- **Limitacao:** Videos expiram em 2 dias no servidor

### Google Veo 3

- **Modelo:** `veo-3-generate-preview`
- **I2V:** Sim
- **First-Last-Frame:** NAO (apenas Veo 3.1)
- **Resolucao:** 720p, 1080p
- **Custo:** $0.40/segundo
- **Nota:** Sem suporte a lastFrame. Para loops, usar Veo 3.1.

---

## Tier A: Excelente Custo-Qualidade

### Kling O1 (First-Last-Frame)

- **Provedor:** Kuaishou, via fal.ai
- **Endpoint fal.ai:** `fal-ai/kling-video/o1/image-to-video`
- **I2V:** Sim
- **First-Last-Frame:** Sim (dual-keyframe nativo)
- **Loop nativo:** Sim, ao usar mesma imagem como first e last frame
- **Resolucao:** 720p, 1080p
- **Duracao:** 5s, 10s
- **Qualidade:** Excelente. "Strongest balance of physical accuracy, visual quality, stability." Otimo para texturas, iluminacao, tecidos.
- **Custo:** $0.112/segundo
- **Vantagem para loops:** A mesma imagem como first e last frame gera "perfect seamless infinite loop" automaticamente.

### Kling 2.5 Turbo Pro / Kling 2.6 Pro

- **Endpoint fal.ai:** `fal-ai/kling-video/v2.5/turbo-pro/image-to-video`
- **I2V:** Sim
- **First-Last-Frame:** Nao (apenas Kling O1)
- **Custo:** $0.07/segundo (2.5 Turbo), $0.07-0.14/s (2.6 Pro)
- **Qualidade:** Muito alta. Motion fluidity excelente.
- **Nota:** Para loops, precisa de ffmpeg post-processing.

### Kling 3.0

- **Provedor:** Kuaishou, via fal.ai
- **Status:** Lancado em 2026, disponivel no fal.ai
- **Qualidade:** "State-of-the-art, built for structured storytelling"
- **Nota:** Verificar se herda suporte a dual-keyframe do O1.

---

## Tier A: Loop Nativo

### Luma Ray 2 (Dream Machine)

- **Provedor:** Luma Labs
- **API:** `POST /dream-machine/v1/generations`
- **I2V:** Sim (via keyframes: frame0, frame1)
- **Loop nativo:** SIM (`"loop": true` na API)
- **First-Last-Frame:** Sim (frame0 + frame1)
- **Resolucao:** 540p, 720p, 1080p, 4K
- **Duracao:** 5s
- **Modelos:** Ray 2 Flash (rapido, barato), Ray 2 (alta qualidade)
- **Camera control:** Linguagem natural no prompt ("camera orbit left")
- **Custo API:** $0.20/task (Ray 2 Flash), $0.50/task (Ray 2)
- **Custo subscription:** 11 credits/s (Flash), 32 credits/s (Standard)
- **Vantagem unica:** UNICO modelo com `loop: true` nativo na API. Zero post-processing necessario.
- **Limitacao:** Qualidade de movimento ligeiramente inferior a Veo/Kling para cenas complexas.

---

## Tier B: Opcoes Solidas

### Runway Gen-4 Turbo

- **Provedor:** Runway
- **API:** Publica, sem aprovacao necessaria (gerar API key no portal)
- **I2V:** Sim
- **First-Last-Frame:** Nao documentado
- **Loop nativo:** Nao
- **Resolucao:** 720p, 1080p
- **Duracao:** 5s, 10s
- **Custo:** 5 credits/segundo = $0.05/segundo (Gen-4 Turbo)
- **Nota:** Gen-4.5 = 12 credits/s ($0.12/s), Gen-4 Aleph = 15 credits/s ($0.15/s)
- **Vantagem:** Muito barato. Bom para prototipagem rapida.
- **Limitacao para loops:** Requer ffmpeg crossfade. Camera control menos preciso que Kling.
- **Curiosidade:** Runway tambem oferece Veo 3/3.1 via sua API (40 credits/s).

### Pika v2.2

- **Provedor:** Pika, via fal.ai
- **Endpoint:** `fal-ai/pika/v2.2/image-to-video`
- **I2V:** Sim
- **Loop nativo:** Nao
- **Resolucao:** 720p ($0.20), 1080p ($0.45)
- **Duracao:** 5s
- **Qualidade:** Boa para movimento suave, mas inferior a Kling/Veo em realismo.
- **Nota:** Ja configurado no setup existente.

### Wan 2.1 FLF2V (First-Last-Frame-to-Video)

- **Provedor:** Alibaba (open-source), via fal.ai
- **Endpoint:** `fal-ai/wan-flf2v`
- **I2V:** Sim
- **First-Last-Frame:** SIM (parametros start_image_url + end_image_url)
- **Resolucao:** 480p ($0.20), 720p ($0.40)
- **Frames:** 81-100 (default 81, ~5s a 16fps)
- **Inference steps:** 2-40 (default 30)
- **Qualidade:** Boa para o preco, mas visivelmente inferior a modelos proprietarios.
- **Vantagem:** Mais barato do mercado. Open-source (self-hostavel).
- **Limitacao:** 720p maximo. Pode ter artefatos em movimentos complexos.

### Wan 2.5 I2V

- **Provedor:** Alibaba, via fal.ai
- **Endpoint:** `fal-ai/wan-i2v`
- **Custo:** $0.05/segundo (480p)
- **First-Last-Frame:** Nao (apenas Wan 2.1 FLF2V)
- **Nota:** Versao mais nova, mas sem suporte a dual-keyframe.

---

## Tier C: Alternativas

### Hailuo 2.3 Pro
- $0.49/video (1080p) via fal.ai
- Qualidade boa, sem suporte a loop nativo

### Minimax Video-01
- $0.50/video via fal.ai
- Sem loop nativo

### Pixverse v3.5
- $0.30-0.80/video via fal.ai
- Sem loop nativo

### Stable Video Diffusion (Replicate)
- Open-source, muito barato (~$0.007/run)
- Qualidade baixa, max 4 segundos, sem loop
- Ultrapassado em 2026

---

## Matriz Resumo: Suporte a Loop

| Modelo | Loop Nativo | First-Last-Frame | Requer ffmpeg |
|--------|-------------|-------------------|---------------|
| Luma Ray 2 | SIM (`loop: true`) | SIM | NAO |
| Veo 3.1 | NAO | SIM (`lastFrame`) | Opcional |
| Kling O1 | NAO | SIM (dual-keyframe) | Opcional |
| Wan 2.1 FLF2V | NAO | SIM | Opcional |
| Runway Gen-4 | NAO | NAO | SIM |
| Pika v2.2 | NAO | NAO | SIM |
| Kling 2.5/2.6 | NAO | NAO | SIM |
| Wan 2.5 | NAO | NAO | SIM |

---

## Ranking para Background Loops de Website

1. **Kling O1 via fal.ai** - Melhor overall. Dual-keyframe com mesma imagem = loop perfeito. Custo razoavel. Qualidade excelente.
2. **Luma Ray 2** - Mais facil (loop nativo). Bom para automacao total. Qualidade levemente inferior.
3. **Veo 3.1 via Gemini API** - Melhor qualidade absoluta. Custo alto. Ideal para hero sections premium.
4. **Wan 2.1 FLF2V via fal.ai** - Mais barato. Qualidade aceitavel para backgrounds sutis.
5. **Runway Gen-4 Turbo** - Barato, mas requer ffmpeg para loop. Sem first-last-frame.
