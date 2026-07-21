# Video Backgrounds Guide — Web Implementation

> Guia prático de implementação de video backgrounds em projetos web.
> Cobre HTML, CSS, Tailwind, React/Next.js, performance e acessibilidade.
> Todos os agentes do design squad consultam este guia ao gerar seções com video background.

## Quando Usar

| Contexto | Recomendação | Motivo |
|----------|-------------|--------|
| Hero section (landing page) | Video (10-15s, gradient overlay) | +80% session duration, +20-30% conversion |
| Section separator | Video curto (5-10s) ou micro-loop | Ambientação sem peso |
| CTA/Footer | Micro-loop (3-5s) ou imagem | Performance crítica |
| Mobile-first | Imagem estática (poster) | Bateria e dados móveis |
| E-commerce | Evitar ou micro-loop leve | LCP e conversion prioritários |

## HTML Boilerplate (5 atributos obrigatórios)

```html
<video autoplay muted loop playsinline preload="none" poster="/poster.jpg">
  <source src="/video.webm" type="video/webm">
  <source src="/video.mp4" type="video/mp4">
</video>
```

| Atributo | Motivo |
|----------|--------|
| `autoplay` | Inicia sem interação do usuário |
| `muted` | Obrigatório para autoplay funcionar em todos browsers |
| `loop` | Repetição contínua |
| `playsinline` | Evita fullscreen automático no iOS |
| `preload="none"` | Não baixa até necessário (lazy) |

**Ordem dos sources:** WebM/VP9 primeiro (menor), MP4/H.264 como fallback (universal).

## CSS: Posicionamento Cover

```css
.video-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.video-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

## Overlays para Legibilidade

3 padrões de overlay. Escolher conforme posição do texto.

### Solid (texto centralizado)

```css
.overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.5); }
```

### Gradient-X (texto à esquerda)

```css
.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.75) 40%, transparent);
}
```

### Gradient-Y (fade para seção seguinte)

```css
.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 1));
}
```

### Tailwind Equivalentes

```html
<!-- Solid -->
<div class="absolute inset-0 bg-black/50"></div>

<!-- Gradient-X -->
<div class="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent"></div>

<!-- Gradient-Y -->
<div class="absolute inset-0 bg-gradient-to-b from-black/60 to-black"></div>
```

## Mobile Fallback (Obrigatório)

Videos consomem dados e bateria em mobile. Substituir por imagem estática.

```css
@media (max-width: 768px) {
  .video-bg { display: none; }
  .video-container {
    background: url('/poster.jpg') center/cover no-repeat;
  }
}
```

**Tailwind:**
```html
<video class="hidden md:block absolute inset-0 w-full h-full object-cover" ...>
<img class="block md:hidden absolute inset-0 w-full h-full object-cover" src="/poster.jpg" alt="" />
```

## Acessibilidade: prefers-reduced-motion (Obrigatório)

```css
@media (prefers-reduced-motion: reduce) {
  .video-bg { display: none; }
  .video-container {
    background: url('/poster.jpg') center/cover no-repeat;
  }
}
```

## Performance: Lazy Play/Pause com Intersection Observer

Pausa videos fora do viewport para reduzir CPU/GPU.

```javascript
const video = document.querySelector('.video-bg');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.play();
    } else {
      entry.target.pause();
    }
  });
}, { threshold: 0.25 });
observer.observe(video);
```

## React/Next.js Component Pattern

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  src: string;
  poster: string;
  overlay?: 'solid' | 'gradient-x' | 'gradient-y';
  children?: React.ReactNode;
}

const overlayClasses = {
  solid: 'bg-black/50',
  'gradient-x': 'bg-gradient-to-r from-black/75 via-black/40 to-transparent',
  'gradient-y': 'bg-gradient-to-b from-black/60 to-black',
};

export default function VideoBackground({
  src,
  poster,
  overlay = 'solid',
  children,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setShowVideo(false);
    const handler = (e: MediaQueryListEvent) => setShowVideo(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !showVideo) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play();
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [showVideo]);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          preload="none"
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={src.replace('.mp4', '.webm')} type="video/webm" />
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className={`absolute inset-0 ${overlayClasses[overlay]}`} />
      <div className="relative z-10 flex items-center justify-center h-full">
        {children}
      </div>
    </section>
  );
}
```

**Uso:**
```tsx
<VideoBackground src="/videos/hero.mp4" poster="/videos/hero-poster.jpg" overlay="gradient-y">
  <h1 className="text-5xl font-bold text-white">Título</h1>
</VideoBackground>
```

## FFmpeg: Otimização de Arquivo

### Targets por Tipo

| Tipo | Duração | Resolução | CRF | Target |
|------|---------|-----------|-----|--------|
| Hero | 10-15s | 1280px | 26-28 | 5-10 MB |
| Section BG | 5-10s | 1280px | 28-30 | 1-3 MB |
| CTA/Footer | 5-8s | 960px | 28-30 | 500KB-1.5MB |
| Micro-loop | 3-5s | 720px | 30-32 | 200-500KB |

### Comandos Prontos

```bash
# Hero (MP4)
ffmpeg -i input.mp4 -vf "scale=1280:-2" \
  -c:v libx264 -profile:v baseline -preset slow \
  -crf 28 -an -movflags +faststart -t 15 hero.mp4

# WebM (20-30% menor)
ffmpeg -i hero.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -an hero.webm

# Poster image
ffmpeg -i hero.mp4 -ss 00:00:03 -frames:v 1 -q:v 2 hero-poster.jpg

# Loop seamless (reverse trick)
ffmpeg -stream_loop 1 -i clip.mp4 \
  -filter_complex "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1" \
  -an -t 10 looped.mp4
```

### Otimizações de Maior Impacto

| Ação | Redução Típica |
|------|----------------|
| Remover audio (`-an`) | 10-15% |
| Scale para 1280px | 40-70% |
| CRF 28 vs CRF 23 | 30-50% |
| WebM VP9 vs MP4 H.264 | 20-30% |
| `preload="none"` + poster | Elimina download desnecessário |

## Performance Targets

| Métrica | Target | Medição |
|---------|--------|---------|
| LCP | < 2.5s | Lighthouse |
| Hero video start | < 3s | Performance API |
| Total videos por página | < 15MB | Network tab |
| FPS durante playback | >= 30fps | DevTools Performance |

## Streaming Adaptativo (HLS)

Para videos > 10MB ou múltiplos devices, usar HLS via Mux:

```tsx
import { MuxBackgroundVideo } from '@mux/mux-background-video/react';

<MuxBackgroundVideo
  src="https://stream.mux.com/PLAYBACK_ID.m3u8"
  maxResolution="720p"
  preload="metadata"
>
  <img src="https://image.mux.com/PLAYBACK_ID/thumbnail.webp" alt="" />
</MuxBackgroundVideo>
```

| Cenário | Formato |
|---------|---------|
| Video < 2MB | MP4 direto |
| Video 2-10MB | HLS ou MP4 com CDN |
| Video > 10MB | HLS obrigatório |

## Referência Cruzada (design-system)

- **Overlay "glass"** sobre video: combinar com `glass-effects-guide.md` para cards glass sobre video
- **Motion audit**: `ds-motion-audit.md` cobre animações CSS; este guia cobre video como motion pattern
- **design-mappings.yaml**: termos "video de fundo", "hero com video", "fundo animado" mapeados
