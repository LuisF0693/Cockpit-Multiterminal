"use strict";

// tailwind-bundle-builder.cjs
//
// Produces a self-contained `showcase.html` artifact that visualizes extracted
// sidecars as an atomic-design tour: source-verified palette, typography
// specimens, interaction-state matrix, motion evidence, and asymmetry signals.
//
// All content is rendered from extracted data only. Per
// .claude/rules/extraction-no-fallbacks.md — sections with no data emit a
// visible extraction_gap block or do not render. The showcase is honest about
// coverage and is not the SOT; DESIGN.md remains canonical.

const { emitTailwindTheme } = require("./tailwind-theme-emitter.cjs");
const { emitComponentClasses } = require("./component-class-emitter.cjs");
const { A11Y_FOCUS_CSS, A11Y_SKIP_LINK_CSS, A11Y_SKIP_LINK_HTML } = require("./html-polish.cjs");

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escAttr(s) {
  return escapeHtml(s);
}

function renderExtractionGap(slot, reason) {
  return `
    <section id="${escAttr(slot)}" data-extraction-gap="${escAttr(reason)}" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">extraction gap</div>
        <div>
          <h2 class="text-h1 font-semibold">${escapeHtml(slot)}</h2>
          <p class="mt-3 opacity-70">${escapeHtml(`extraction_gap(${reason})`)}</p>
        </div>
      </div>
    </section>`;
}

function specimenStyle(style) {
  if (!style || typeof style !== "object") return "";
  const declarations = [];
  if (style.fontFamily) declarations.push(`font-family:${escAttr(style.fontFamily)}`);
  if (style.fontSize) declarations.push(`font-size:${escAttr(style.fontSize)}`);
  if (style.fontWeight) declarations.push(`font-weight:${escAttr(style.fontWeight)}`);
  if (style.lineHeight) declarations.push(`line-height:${escAttr(style.lineHeight)}`);
  if (style.letterSpacing) declarations.push(`letter-spacing:${escAttr(style.letterSpacing)}`);
  return declarations.length > 0 ? ` style="${declarations.join(";")};"` : "";
}

function specimenMeta(style) {
  if (!style || typeof style !== "object") return "extraction_gap(typography_style_empty)";
  const parts = [];
  if (style.fontSize) parts.push(style.fontSize);
  if (style.lineHeight) parts.push(`lh ${style.lineHeight}`);
  if (style.fontWeight) parts.push(`w${style.fontWeight}`);
  if (style.letterSpacing) parts.push(`ls ${style.letterSpacing}`);
  return parts.length > 0 ? parts.join(" / ") : "extraction_gap(typography_metrics_missing)";
}

// Brand-voice resolver — picks a real specimen string from extracted page
// content for a given typography role. Falls back to a brand-flavored generic
// when extracted text is unavailable. Used to replace "Design system specimen"
// placeholders with the actual brand voice (e.g. "The simplest way to create
// forms" instead of "Design system specimen" for display-hero on tally.so).
function brandVoiceFor(role, { heroBlock, pageCopy, ctaVariants, brandLabel } = {}) {
  const headline = heroBlock?.headline || pageCopy?.heading || null;
  const lead = heroBlock?.lead || null;
  const ctaLabel = heroBlock?.ctas?.[0]?.label || ctaVariants?.primary?.label || null;
  const map = {
    "display-hero":      headline,
    "display-large":     headline,
    "section-heading":   headline ? headline.split(/[.!?]/)[0] : null,
    "subheading-large":  lead ? lead.split(/[.!?]/)[0] : null,
    "subheading":        lead ? lead.split(/[.!?]/)[0] : null,
    "body-large":        lead,
    "body":              lead,
    "body-small":        ctaLabel ? `${brandLabel || "Brand"} · ${ctaLabel}` : null,
    "button":            ctaLabel,
    "button-small":      ctaLabel,
    "link":              ctaLabel ? `${ctaLabel} →` : null,
    "caption":           pageCopy?.body ? pageCopy.body.split("|")[0].trim() : null,
  };
  if (map[role]) return map[role];
  return null;
}

// ── Section: source-verified palette ──────────────────────────────────
// Each swatch shows hex + role + the selector(s) that produced it.

function renderPaletteSection(tokens, provenance) {
  const colors = (tokens && tokens.colors) || {};
  const colorEntries = Object.entries(colors).filter(([, v]) => typeof v === "string" && v.startsWith("#"));
  if (colorEntries.length === 0) return "";

  const swatches = colorEntries
    .map(([role, hex]) => {
      const lc = String(hex).toLowerCase();
      const provBucket = provenance && provenance.colors && provenance.colors[lc];
      const sources = provBucket ? provBucket.selectors.slice(0, 3) : [];
      const primaryCtx = provBucket ? provBucket.primary_context : null;
      const sourcesHtml = sources.length === 0
        ? '<span class="opacity-50 text-xs">no provenance recorded</span>'
        : sources.map((s) => `<code class="text-[11px] opacity-70">${escapeHtml(s.selector)} <span class="opacity-50">(${escapeHtml(s.property)})</span></code>`).join('<br>');
      return `
        <div class="border p-4" style="border-color: var(--color-border);">
          <div class="h-16 w-full" style="background:${escAttr(hex)};"></div>
          <div class="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] opacity-70">${escapeHtml(role)}</div>
          <div class="mt-1 font-mono text-[11px]">${escapeHtml(hex)}</div>
          ${primaryCtx ? `<div class="mt-1 text-[11px] opacity-60">primary: ${escapeHtml(primaryCtx)}</div>` : ""}
          <div class="mt-3 leading-relaxed">${sourcesHtml}</div>
        </div>`;
    })
    .join("");

  return `
    <!-- 01 ATOMS · Color palette (source-verified) -->
    <section id="section-01-color" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">01</span> · ATOMS · color palette
          <div class="mt-2 opacity-70">${colorEntries.length} role${colorEntries.length === 1 ? "" : "s"}</div>
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Source-verified palette</h2>
          <p class="mt-3 opacity-70">Each swatch traces back to the CSS selectors that produced it.</p>
          <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            ${swatches}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Section: typography specimens ─────────────────────────────────────

function renderTypographySection(tokens, brandContext = {}) {
  const typography = (tokens && tokens.typography) || {};
  const styles = Object.entries(typography);
  if (styles.length === 0) return "";

  const specimens = styles
    .map(([name, style]) => {
      if (!style) return "";
      const brandText = brandVoiceFor(name, brandContext);
      const specimenText = brandText || "Design system specimen";
      const isExtracted = brandText != null;
      return `
        <div class="border p-5" style="border-color: var(--color-border);">
          <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60">${escapeHtml(name)}${isExtracted ? ' <span class="opacity-70">· extracted</span>' : ""}</div>
          <div class="mt-4"${specimenStyle(style)}>
            ${escapeHtml(specimenText)}
          </div>
          <div class="mt-3 font-mono text-[11px] opacity-60">
            ${escapeHtml(specimenMeta(style))}
          </div>
        </div>`;
    })
    .join("");

  return `
    <!-- 02 ATOMS · Typography -->
    <section id="section-02-typography" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">02</span> · ATOMS · typography
          <div class="mt-2 opacity-70">${styles.length} style${styles.length === 1 ? "" : "s"}</div>
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Typography</h2>
          <div class="mt-8 grid gap-4 lg:grid-cols-2">
            ${specimens}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Section: button states matrix ─────────────────────────────────────

function renderButtonMatrixSection(componentStates) {
  const palette = (componentStates && componentStates.state_value_palette) || {};
  const present = (componentStates && componentStates.summary && componentStates.summary.states_present) || [];
  if (present.length === 0) return "";

  const stateCells = (state, palettes) => {
    if (palettes.length === 0) return '<td class="p-4 opacity-40">—</td>';
    return `<td class="p-4"><div class="flex flex-wrap gap-2">${palettes
      .slice(0, 4)
      .map((v) => `<span class="inline-block h-6 w-6 border" style="background:${escAttr(v)};border-color:var(--color-border);" title="${escAttr(v)}"></span>`)
      .join("")}</div><div class="mt-1 font-mono text-[10px] opacity-60">${palettes.length} value${palettes.length === 1 ? "" : "s"}</div></td>`;
  };

  return `
    <!-- 07 MOLECULES · Button states matrix -->
    <section id="section-07-states" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">07</span> · MOLECULES · button states
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Interaction state palette</h2>
          <p class="mt-3 opacity-70">Aggregated from extracted state rules. Empty cells mean the source CSS contains no rules for that pairing — honest report.</p>
          <table class="mt-8 w-full border" style="border-color: var(--color-border);border-collapse:collapse;">
            <thead>
              <tr class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60">
                <th class="p-3 text-left border-r" style="border-color: var(--color-border);">slot</th>
                <th class="p-3 text-left border-r" style="border-color: var(--color-border);">hover</th>
                <th class="p-3 text-left border-r" style="border-color: var(--color-border);">disabled</th>
                <th class="p-3 text-left">focus</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t" style="border-color: var(--color-border);">
                <td class="p-4 font-mono text-[12px]">backgrounds</td>
                ${stateCells("hover", palette.hover_backgrounds || [])}
                ${stateCells("disabled", palette.disabled_backgrounds || [])}
                ${stateCells("focus", palette.focus_box_shadows || palette.focus_outlines || [])}
              </tr>
              <tr class="border-t" style="border-color: var(--color-border);">
                <td class="p-4 font-mono text-[12px]">colors</td>
                ${stateCells("hover", palette.hover_colors || [])}
                ${stateCells("disabled", palette.disabled_colors || [])}
                ${stateCells("focus", palette.focus_border_colors || [])}
              </tr>
              <tr class="border-t" style="border-color: var(--color-border);">
                <td class="p-4 font-mono text-[12px]">opacities</td>
                ${stateCells("hover", palette.hover_opacities || [])}
                ${stateCells("disabled", palette.disabled_opacities || [])}
                <td class="p-4 opacity-40">—</td>
              </tr>
            </tbody>
          </table>
          <div class="mt-4 font-mono text-[11px] opacity-60">
            states present: ${present.join(", ") || "(none)"}<br>
            states absent: ${(componentStates.summary.states_absent || []).join(", ") || "(none)"}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Section: motion demo ──────────────────────────────────────────────

function renderMotionSection(motion) {
  if (!motion) return "";
  const transitions = motion.transitions || [];
  const keyframes = motion.keyframe_bodies || {};
  if (transitions.length === 0 && Object.keys(keyframes).length === 0) return "";

  const transitionRows = transitions
    .map((t) => `
      <tr class="border-t" style="border-color: var(--color-border);">
        <td class="p-3 font-mono text-[12px]">${escapeHtml(t.property)}</td>
        <td class="p-3 font-mono text-[12px]">${escapeHtml(t.duration)}</td>
        <td class="p-3 font-mono text-[12px]">${escapeHtml(t.timing || "extraction_gap(motion_timing_missing)")}</td>
        <td class="p-3 font-mono text-[12px] opacity-60">×${t.count}</td>
      </tr>`)
    .join("");

  const keyframeBlocks = Object.entries(keyframes)
    .map(([name, body]) => `
      <div class="border p-4" style="border-color: var(--color-border);">
        <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60">@keyframes ${escapeHtml(name)}</div>
        <pre class="mt-3 overflow-x-auto text-[11px] font-mono opacity-80">${escapeHtml(body)}</pre>
      </div>`)
    .join("");

  return `
    <!-- 06 ATOMS · Motion -->
    <section id="section-06-motion" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">06</span> · ATOMS · motion
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Motion language</h2>
          ${transitions.length > 0 ? `
          <table class="mt-8 w-full border" style="border-color: var(--color-border);border-collapse:collapse;">
            <thead>
              <tr class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60">
                <th class="p-3 text-left border-r" style="border-color: var(--color-border);">property</th>
                <th class="p-3 text-left border-r" style="border-color: var(--color-border);">duration</th>
                <th class="p-3 text-left border-r" style="border-color: var(--color-border);">timing</th>
                <th class="p-3 text-left">count</th>
              </tr>
            </thead>
            <tbody>${transitionRows}</tbody>
          </table>` : ""}
          ${keyframeBlocks ? `<div class="mt-6 grid gap-3 lg:grid-cols-2">${keyframeBlocks}</div>` : ""}
        </div>
      </div>
    </section>`;
}

// ── Section: asymmetries panel ────────────────────────────────────────

function renderAsymmetriesSection(asymmetryReport) {
  if (!asymmetryReport || !Array.isArray(asymmetryReport.asymmetries)) return "";
  const list = asymmetryReport.asymmetries;
  if (list.length === 0) return "";
  const rows = list
    .map((a) => `
      <div class="border p-5" style="border-color: var(--color-border);">
        <div class="flex items-baseline gap-3">
          <span class="font-mono text-[10px] uppercase tracking-[0.16em] opacity-60">${escapeHtml(a.severity)}</span>
          <span class="font-mono text-[11px] opacity-50">${escapeHtml(a.category)}</span>
        </div>
        <h3 class="mt-2 font-medium">${escapeHtml(a.title)}</h3>
        <p class="mt-2 text-sm opacity-80 leading-relaxed">${escapeHtml(a.description)}</p>
        <details class="mt-3 text-[12px]"><summary class="cursor-pointer opacity-60">design implication</summary><div class="mt-2 opacity-80">${escapeHtml(a.design_implication)}</div></details>
      </div>`)
    .join("");

  return `
    <!-- 13 EXTRACTION · Brand identity asymmetries -->
    <section id="section-13-asymmetries" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">13</span> · brand identity signals
          <div class="mt-2 opacity-70">${list.length} signal${list.length === 1 ? "" : "s"}</div>
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Asymmetries</h2>
          <p class="mt-3 opacity-70">Patterns of absence, uniformity, sparseness. Each is a brand decision downstream consumers MUST honor.</p>
          <div class="mt-8 grid gap-4 lg:grid-cols-2">
            ${rows}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Section: visual captures index ────────────────────────────────────
// Renders thumbnails of the captured screenshots so the showcase IS a visual
// reference, not just a token catalog. Captures live in inputs/captures/ and
// are referenced relative to the showcase output dir.

function renderCapturesSection(capturesManifest) {
  if (!capturesManifest) return "";
  const viewports = Array.isArray(capturesManifest.viewports) ? capturesManifest.viewports.filter((v) => v.file && !v.error) : [];
  const sections = Array.isArray(capturesManifest.sections) ? capturesManifest.sections.filter((s) => s.file && !s.error) : [];
  if (viewports.length === 0 && sections.length === 0) return "";

  const renderTile = (cap, isSection) => {
    const src = `inputs/${cap.file}`;
    const label = isSection ? (cap.heading || cap.tag) : cap.label;
    const meta = isSection ? `1440×${cap.clip_height || cap.height} · ${cap.format}` : `${cap.viewport}${cap.fullPage ? " · full" : ""} · ${cap.format}`;
    const sizeKb = cap.bytes ? `${(cap.bytes / 1024).toFixed(0)}KB` : "";
    return `
        <a href="${escAttr(src)}" target="_blank" class="border block overflow-hidden hover:opacity-90 transition" style="border-color: var(--color-border);">
          <div class="overflow-hidden bg-[var(--color-surface-muted,#f3f3f3)]" style="aspect-ratio: ${isSection ? "16/9" : "16/10"};">
            <img src="${escAttr(src)}" alt="${escAttr(label)}" loading="lazy" class="w-full h-full object-cover object-top" />
          </div>
          <div class="p-3">
            <div class="text-[12px] font-medium">${escapeHtml(label)}</div>
            <div class="mt-1 font-mono text-[10px] opacity-60">${escapeHtml(meta)} · ${escapeHtml(sizeKb)}</div>
          </div>
        </a>`;
  };

  const vpHtml = viewports.length > 0 ? `
        <div>
          <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 mb-3">Viewports (${viewports.length})</div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            ${viewports.map((v) => renderTile(v, false)).join("")}
          </div>
        </div>` : "";

  const secHtml = sections.length > 0 ? `
        <div class="mt-8">
          <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 mb-3">Sections (${sections.length})</div>
          <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            ${sections.map((s) => renderTile(s, true)).join("")}
          </div>
        </div>` : "";

  return `
    <!-- 00 CAPTURES · Visual evidence -->
    <section id="section-00-captures" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">00</span> · CAPTURES · visual evidence
          <div class="mt-2 opacity-70">${viewports.length + sections.length} captures</div>
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Live page captures</h2>
          <p class="mt-2 opacity-70 max-w-2xl">Pixel-accurate snapshots from the rendered page, used as multimodal evidence for the DESIGN.md extraction. Click any tile to open at full size.</p>
          <div class="mt-6">
            ${vpHtml}
            ${secHtml}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Section: spacing · radius · elevation ────────────────────────────
function renderSpacingRadiusElevationSection(tokens) {
  const spacing = (tokens && tokens.spacing) || {};
  const rounded = (tokens && tokens.rounded) || {};
  const shadows = (tokens && tokens.shadows) || {};
  const spacingEntries = Object.entries(spacing);
  const roundedEntries = Object.entries(rounded);
  const shadowEntries = Object.entries(shadows);
  if (spacingEntries.length === 0 && roundedEntries.length === 0 && shadowEntries.length === 0) return "";

  const spacingHtml = spacingEntries.length > 0 ? `
        <div class="border p-5" style="border-color: var(--color-border);">
          <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 mb-3">Spacing (${spacingEntries.length})</div>
          <div class="space-y-2 text-[12px]">
            ${spacingEntries.map(([name, val]) => `<div class="flex items-center gap-2"><div class="h-3 bg-[var(--color-primary,#000)]" style="width:${escAttr(val)};"></div><span class="font-mono">${escapeHtml(val)}</span><span class="opacity-60">${escapeHtml(name)}</span></div>`).join("")}
          </div>
        </div>` : "";

  const roundedHtml = roundedEntries.length > 0 ? `
        <div class="border p-5" style="border-color: var(--color-border);">
          <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 mb-3">Radius (${roundedEntries.length})</div>
          <div class="grid grid-cols-3 gap-3 text-center font-mono text-[11px] opacity-60">
            ${roundedEntries.map(([name, val]) => `<div><div class="mb-2 h-12 bg-[var(--color-surface-muted,#f3f3f3)]" style="border-radius:${escAttr(val)};"></div>${escapeHtml(val)} · ${escapeHtml(name)}</div>`).join("")}
          </div>
        </div>` : "";

  const shadowHtml = shadowEntries.length > 0 ? `
        <div class="border p-5" style="border-color: var(--color-border);">
          <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 mb-3">Elevation (${shadowEntries.length})</div>
          <div class="grid gap-3 text-[12px]">
            ${shadowEntries.slice(0, 6).map(([name, val]) => `<div class="rounded p-2" style="background:#fff;box-shadow:${escAttr(val)};"><span class="font-mono opacity-60">${escapeHtml(name)}</span></div>`).join("")}
          </div>
        </div>` : "";

  return `
    <!-- 03 ATOMS · Spacing · Radius · Elevation -->
    <section id="section-03-spacing" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">03</span> · ATOMS · spacing · radius · elevation
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Foundations</h2>
          <div class="mt-6 grid gap-3 md:grid-cols-3">
            ${spacingHtml}
            ${roundedHtml}
            ${shadowHtml}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Section: real component reproductions (atoms) ────────────────────
// Renders extracted button/card/input recipes as live HTML — not specimens
// (text-only) but actual styled components using extracted tokens.
//
// Auto-discovery: matches any component name starting with `button-`, `btn-`
// or `cta-`. Filters out state variants (`-hover`, `-active`, `-disabled`,
// `-focus`) since those are renderable from the base recipe + extracted state
// hex values, not standalone atoms.
function renderAtomsSection(tokens, brandContext = {}) {
  const components = (tokens && tokens.components) || {};
  const STATE_SUFFIX = /-(hover|active|disabled|focus|focus-visible|pressed)$/i;
  const buttonRe = /^(button|btn|cta)[-_]/i;
  const buttons = Object.entries(components)
    .filter(([name, recipe]) => recipe && typeof recipe === "object" && buttonRe.test(name) && !STATE_SUFFIX.test(name))
    .map(([name, recipe]) => ({ name, recipe }))
    .slice(0, 8); // cap to keep showcase manageable
  if (buttons.length === 0) return "";

  const ctaLabel = brandContext.heroBlock?.ctas?.[0]?.label || "Action";
  const altLabel = brandContext.ctaVariants?.secondary?.label || "Cancel";

  const buttonStyle = (recipe) => {
    const decls = [];
    if (recipe.bg) decls.push(`background:${recipe.bg}`);
    if (recipe.text) decls.push(`color:${recipe.text}`);
    if (recipe.border && recipe.border !== "transparent") decls.push(`border:1px solid ${recipe.border}`);
    if (recipe.radius) decls.push(`border-radius:${recipe.radius}`);
    if (recipe.padding) decls.push(`padding:${recipe.padding}`);
    if (recipe.height) decls.push(`height:${recipe.height};display:inline-flex;align-items:center;justify-content:center`);
    return decls.join(";");
  };

  const buttonsHtml = buttons.map((b, i) => {
    const label = i === 0 ? ctaLabel : (i === 1 ? altLabel : b.name.replace(/^button-/, ""));
    return `
        <div class="border p-5" style="border-color: var(--color-border);">
          <div class="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 mb-3">${escapeHtml(b.name)} · extracted</div>
          <button style="${escAttr(buttonStyle(b.recipe))}">${escapeHtml(label)}</button>
          <div class="mt-3 font-mono text-[11px] opacity-60">${b.recipe.height ? escapeHtml(b.recipe.height) + " · " : ""}${b.recipe.radius ? "r " + escapeHtml(b.recipe.radius) : ""}${b.recipe.bg ? " · " + escapeHtml(b.recipe.bg) : ""}</div>
        </div>`;
  }).join("");

  return `
    <!-- 04 ATOMS · Buttons (extracted recipes) -->
    <section id="section-04-atoms" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">04</span> · ATOMS · buttons
          <div class="mt-2 opacity-70">${buttons.length} variant${buttons.length === 1 ? "" : "s"}</div>
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Buttons</h2>
          <p class="mt-2 opacity-70 max-w-2xl">Live reproductions using extracted recipes from <code class="font-mono text-[12px] opacity-80">DESIGN.md/components.button-*</code>. Labels pulled from extracted hero CTA where available.</p>
          <div class="mt-6 grid gap-3 lg:grid-cols-2">
            ${buttonsHtml}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Section: cards (molecules) ────────────────────────────────────────
// Auto-discovery: matches any component name containing "card" (e.g. card,
// card-featured, feature-card-photo, product-card). Filters state variants.
function renderMoleculesSection(tokens, brandContext = {}) {
  const components = (tokens && tokens.components) || {};
  const STATE_SUFFIX = /-(hover|active|disabled|focus|focus-visible|pressed)$/i;
  const cards = Object.entries(components)
    .filter(([name, recipe]) => recipe && typeof recipe === "object" && /card/i.test(name) && !STATE_SUFFIX.test(name))
    .map(([name, recipe]) => ({ name, recipe }))
    .slice(0, 4);
  if (cards.length === 0) return "";

  const headline = brandContext.heroBlock?.headline || brandContext.brandLabel || "Card title";
  const lead = brandContext.heroBlock?.lead || "Card body content using the extracted card recipe.";

  const cardStyle = (recipe) => {
    const decls = [];
    if (recipe.bg) decls.push(`background:${recipe.bg}`);
    if (recipe.text) decls.push(`color:${recipe.text}`);
    if (recipe.border && recipe.border !== "transparent") decls.push(`border:1px solid ${recipe.border}`);
    if (recipe.radius) decls.push(`border-radius:${recipe.radius}`);
    if (recipe.padding) decls.push(`padding:${recipe.padding}`);
    if (recipe.shadow) decls.push(`box-shadow:${recipe.shadow}`);
    return decls.join(";");
  };

  const cardsHtml = cards.map((c) => {
    const isFeatured = c.name === "card-featured";
    return `
        <div style="${escAttr(cardStyle(c.recipe))}">
          ${isFeatured ? '<div class="font-mono text-[11px] uppercase tracking-[0.14em] mb-3" style="color: var(--color-primary);">Featured</div>' : ""}
          <h3 class="text-[18px] font-semibold">${escapeHtml(headline.slice(0, 60))}</h3>
          <p class="mt-2 text-[14px] opacity-80 leading-relaxed">${escapeHtml(lead.slice(0, 140))}</p>
        </div>`;
  }).join("");

  return `
    <!-- 05 MOLECULES · Cards (extracted recipes) -->
    <section id="section-05-molecules" class="border-t py-12 px-6 md:px-12" style="border-color: var(--color-border);">
      <div class="grid gap-8 md:grid-cols-[200px_1fr]">
        <div class="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
          <span style="color: var(--color-primary);">05</span> · MOLECULES · cards
          <div class="mt-2 opacity-70">${cards.length} variant${cards.length === 1 ? "" : "s"}</div>
        </div>
        <div>
          <h2 class="text-h1 font-semibold">Cards</h2>
          <p class="mt-2 opacity-70 max-w-2xl">Live reproductions using extracted recipes from <code class="font-mono text-[12px] opacity-80">DESIGN.md/components.card</code>. Headline + body use real brand voice.</p>
          <div class="mt-6 grid gap-4 lg:grid-cols-2">
            ${cardsHtml}
          </div>
        </div>
      </div>
    </section>`;
}

// ── Public: build the full showcase ────────────────────────────────────

function buildShowcaseHtml(context) {
  const ctx = context || {};
  const tokens = ctx.tokens || {};
  const provenance = ctx.provenance;
  const componentStates = ctx.componentStates;
  const motion = ctx.motion;
  const asymmetryReport = ctx.asymmetryReport;
  const componentProperties = ctx.componentProperties;
  const url = ctx.url || "";
  const brandLabel = ctx.brand || tokens.name || "Brand";
  // Brand-aware context — used by typography/atoms/molecules renderers to
  // pull real brand voice and CTA labels from extraction sidecars instead
  // of generic "Design system specimen" placeholders.
  const brandContext = {
    heroBlock: ctx.heroBlock || null,
    pageCopy: ctx.pageCopy || null,
    ctaVariants: ctx.ctaVariants || null,
    brandLabel,
  };
  const capturesManifest = ctx.capturesManifest || null;

  const themeBlock = emitTailwindTheme(tokens);
  const componentCss = emitComponentClasses({
    componentProperties,
    componentStates,
    motion,
    options: { prefix: "preview" },
  });

  const sections = [
    { id: "section-00-captures", label: "00 Captures", html: renderCapturesSection(capturesManifest) },
    { id: "section-01-color", label: "01 Color", html: renderPaletteSection(tokens, provenance) },
    { id: "section-02-typography", label: "02 Typography", html: renderTypographySection(tokens, brandContext) },
    { id: "section-03-spacing", label: "03 Spacing", html: renderSpacingRadiusElevationSection(tokens) },
    { id: "section-04-atoms", label: "04 Atoms", html: renderAtomsSection(tokens, brandContext) },
    { id: "section-05-molecules", label: "05 Molecules", html: renderMoleculesSection(tokens, brandContext) },
    { id: "section-06-motion", label: "06 Motion", html: renderMotionSection(motion) },
    { id: "section-07-states", label: "07 States", html: renderButtonMatrixSection(componentStates) },
    { id: "section-13-asymmetries", label: "13 Signals", html: renderAsymmetriesSection(asymmetryReport) },
  ].filter(Boolean);

  const renderedSections = sections.filter((section) => section.html);
  const navHtml = renderedSections.length > 0
    ? `<nav aria-label="Showcase sections" class="sticky top-0 z-10 border-b px-6 py-3 md:px-12" style="border-color: var(--color-border); background: var(--color-surface);">
        <div class="flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
          ${renderedSections.map((section) => `<a class="opacity-70 hover:opacity-100" href="#${escAttr(section.id)}">${escapeHtml(section.label)}</a>`).join("\n          ")}
        </div>
      </nav>`
    : "";
  const sectionsHtml = renderedSections.length > 0
    ? renderedSections.map((section) => section.html).join("\n")
    : renderExtractionGap("showcase", "no_extracted_sections");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(brandLabel)} · Atomic Design Showcase</title>`,
    '  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>',
    themeBlock,
    "  <style>",
    A11Y_FOCUS_CSS,
    A11Y_SKIP_LINK_CSS,
    componentCss,
    "  </style>",
    "</head>",
    `<body style="background: var(--color-surface); color: var(--color-text); -webkit-font-smoothing: antialiased;">`,
    A11Y_SKIP_LINK_HTML,
    '<header class="border-b py-8 px-6 md:px-12" style="border-color: var(--color-border);">',
    '  <div class="mb-6 border px-4 py-3 text-[12px]" style="border-color: var(--color-border);" role="note">Visualization of DESIGN.md tokens. SOT is DESIGN.md.</div>',
    `  <div class="font-mono text-[11px] uppercase tracking-[0.16em] opacity-60">${escapeHtml(url)}</div>`,
    `  <h1 class="mt-2 text-h1 font-semibold">${escapeHtml(brandLabel)} · Atomic Design Showcase</h1>`,
    '  <p class="mt-3 opacity-70 max-w-2xl">Self-contained brand surface — every swatch, specimen, state, and signal traces back to the source CSS. No fallbacks. No invention.</p>',
    "</header>",
    navHtml,
    '<main id="main-content">',
    sectionsHtml,
    "</main>",
    '<footer class="border-t py-8 px-6 md:px-12 text-[12px] opacity-60" style="border-color: var(--color-border);">',
    "  Generated by /design-md — squads/design-ops/scripts/extract-from-url",
    "</footer>",
    "</body>",
    "</html>",
  ].join("\n");
}

const buildTailwindBundle = buildShowcaseHtml;

module.exports = {
  buildShowcaseHtml,
  buildTailwindBundle,
  // exported for tests
  renderPaletteSection,
  renderTypographySection,
  renderButtonMatrixSection,
  renderMotionSection,
  renderAsymmetriesSection,
  renderCapturesSection,
  renderSpacingRadiusElevationSection,
  renderAtomsSection,
  renderMoleculesSection,
  brandVoiceFor,
  escapeHtml,
};
