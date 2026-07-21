#!/usr/bin/env bash
#
# scaffold-ds.sh v2.1.0 — Framework-agnostic Design System scaffolder.
#
# Targets: Tailwind v4 + shadcn/ui (new-york) + Radix namespace + TS strict.
# Framework is a PARAMETER: next (Next.js 16) | vite (Vite 5) + others deferred.
# Icon and animation libraries are BRAND-DRIVEN — operator MUST choose explicitly.
#
# Closes GAP-DS-001. Implements archetype v2.0.0 mandatory_outputs:
#   - baseline (all profiles):  check-token-drift.mjs + components.map.json + focus-indicators-global.css
#   - full_only:                build-manifest.mjs + tokens.dtcg.json + designTokensLanguageServer config
#
# Usage:
#   ./scaffold-ds.sh --target=foo-ds --framework=next --profile=lean --icons=lucide --animations=tw-animate
#   ./scaffold-ds.sh --target=bar-ds --framework=vite --profile=full --icons=phosphor --animations=framer
#   ./scaffold-ds.sh --target=baz-ds --framework=next --icons=none --animations=none
#
# Flags:
#   --target=NAME        (required) App name under apps/ (e.g., foo-ds).
#   --framework=FW       (optional) 'next' | 'vite'. Default: next (backward compat).
#   --profile=PROFILE    (optional) 'lean' | 'full'. Default: lean.
#   --icons=LIB          (REQUIRED) Icon library — see ICON LIBRARY OPTIONS below.
#   --animations=LIB     (REQUIRED) Animation library — see ANIMATION LIBRARY OPTIONS below.
#   --source-dir=DIR     (optional) Static source dir under apps/NAME/. Default: legacy-static.
#   --skip-install       (optional) Skip `npm install`.
#   --skip-legacy-move   (optional) Skip moving legacy dirs (already done).
#
# ICON LIBRARY OPTIONS (per archetype.brand_driven.icons):
#   lucide      — lucide-react (dev tools, admin dashboards; shadcn standard)
#   phosphor    — @phosphor-icons/react (marketing, brand-rich, e-commerce; 4 weights)
#   heroicons   — @heroicons/react (Tailwind-canonical; minimalist)
#   tabler      — @tabler/icons-react (5000+ icons, niche coverage)
#   react-icons — react-icons (multi-pack aggregator: FA, Material, Bootstrap, etc.)
#   iconify     — @iconify/react (200k+ icons via API)
#   none        — no icon library installed (brand uses inline SVGs only)
#
# ANIMATION LIBRARY OPTIONS (per archetype.brand_driven.animations):
#   tw-animate    — tw-animate-css (Tailwind-native CSS; B2B/admin)
#   framer        — framer-motion (marketing, hero, gestures)
#   motion        — motion (vanilla; framework-agnostic)
#   auto-animate  — @formkit/auto-animate (list/grid reorder)
#   react-spring  — @react-spring/web (physics-based)
#   none          — no animation library (CSS keyframes only)
#
# Exit codes:
#   0  OK     | 1  Bad args        | 2  Repo root not found
#   3  Target missing | 4  npm install failed | 5  Template missing

set -euo pipefail

TARGET=""
FRAMEWORK="next"
PROFILE="lean"
ICONS=""
ANIMATIONS=""
SOURCE_DIR="legacy-static"
SKIP_INSTALL=0
SKIP_LEGACY_MOVE=0

for arg in "$@"; do
  case "$arg" in
    --target=*)          TARGET="${arg#*=}" ;;
    --framework=*)       FRAMEWORK="${arg#*=}" ;;
    --profile=*)         PROFILE="${arg#*=}" ;;
    --icons=*)           ICONS="${arg#*=}" ;;
    --animations=*)      ANIMATIONS="${arg#*=}" ;;
    --source-dir=*)      SOURCE_DIR="${arg#*=}" ;;
    --skip-install)      SKIP_INSTALL=1 ;;
    --skip-legacy-move)  SKIP_LEGACY_MOVE=1 ;;
    -h|--help)           sed -n '1,52p' "$0"; exit 0 ;;
    *) echo "ERR: unknown flag: $arg" >&2; exit 1 ;;
  esac
done

if [[ -z "$TARGET" ]]; then echo "ERR: --target is required" >&2; exit 1; fi
if [[ "$FRAMEWORK" != "next" && "$FRAMEWORK" != "vite" ]]; then
  echo "ERR: --framework must be 'next' or 'vite' (v2.1.0 MVP). Other frameworks are ARCHITECTURAL_PLACEHOLDER in archetype." >&2
  exit 1
fi
if [[ "$PROFILE" != "lean" && "$PROFILE" != "full" ]]; then
  echo "ERR: --profile must be 'lean' or 'full'" >&2; exit 1
fi

# ─── BRAND-DRIVEN: icons ────────────────────────────────────────────────────
if [[ -z "$ICONS" ]]; then
  echo "ERR: --icons is required (no silent default — brand must choose)." >&2
  echo "" >&2
  echo "Options (per archetype.brand_driven.icons):" >&2
  echo "  lucide      — dev tools, admin (shadcn standard)" >&2
  echo "  phosphor    — marketing, brand-rich, e-commerce (4 weights)" >&2
  echo "  heroicons   — Tailwind-canonical, minimalist" >&2
  echo "  tabler      — wide variety (5000+)" >&2
  echo "  react-icons — multi-pack aggregator" >&2
  echo "  iconify     — 200k+ via API" >&2
  echo "  none        — no library; brand uses inline SVGs" >&2
  echo "" >&2
  echo "See: squads/design-ops/rules/stack-invariant-vs-framework-parameterized.md" >&2
  exit 1
fi
case "$ICONS" in
  lucide|phosphor|heroicons|tabler|react-icons|iconify|none) : ;;
  *) echo "ERR: --icons must be one of: lucide, phosphor, heroicons, tabler, react-icons, iconify, none" >&2; exit 1 ;;
esac

# ─── BRAND-DRIVEN: animations ───────────────────────────────────────────────
if [[ -z "$ANIMATIONS" ]]; then
  echo "ERR: --animations is required (no silent default — brand must choose)." >&2
  echo "" >&2
  echo "Options (per archetype.brand_driven.animations):" >&2
  echo "  tw-animate    — Tailwind-native CSS (B2B/admin)" >&2
  echo "  framer        — Framer Motion (marketing, hero)" >&2
  echo "  motion        — Motion vanilla (framework-agnostic)" >&2
  echo "  auto-animate  — @formkit/auto-animate (list reorder)" >&2
  echo "  react-spring  — physics-based" >&2
  echo "  none          — CSS keyframes only" >&2
  echo "" >&2
  echo "See: squads/design-ops/rules/stack-invariant-vs-framework-parameterized.md" >&2
  exit 1
fi
case "$ANIMATIONS" in
  tw-animate|framer|motion|auto-animate|react-spring|none) : ;;
  *) echo "ERR: --animations must be one of: tw-animate, framer, motion, auto-animate, react-spring, none" >&2; exit 1 ;;
esac

# ─── Map flag values to npm package names + versions + components.json key ──
declare ICON_PACKAGE=""
declare ICON_PACKAGE_VERSION=""
declare ICON_LIBRARY_FIELD=""    # value for components.json `iconLibrary`
case "$ICONS" in
  lucide)
    ICON_PACKAGE="lucide-react"; ICON_PACKAGE_VERSION="^0.563.0"; ICON_LIBRARY_FIELD="lucide" ;;
  phosphor)
    ICON_PACKAGE="@phosphor-icons/react"; ICON_PACKAGE_VERSION="^2.1.10"; ICON_LIBRARY_FIELD="phosphor" ;;
  heroicons)
    ICON_PACKAGE="@heroicons/react"; ICON_PACKAGE_VERSION="^2.2.0"; ICON_LIBRARY_FIELD="heroicons" ;;
  tabler)
    ICON_PACKAGE="@tabler/icons-react"; ICON_PACKAGE_VERSION="^3.27.0"; ICON_LIBRARY_FIELD="tabler" ;;
  react-icons)
    ICON_PACKAGE="react-icons"; ICON_PACKAGE_VERSION="^5.4.0"; ICON_LIBRARY_FIELD="react-icons" ;;
  iconify)
    ICON_PACKAGE="@iconify/react"; ICON_PACKAGE_VERSION="^5.2.0"; ICON_LIBRARY_FIELD="iconify" ;;
  none)
    ICON_PACKAGE=""; ICON_PACKAGE_VERSION=""; ICON_LIBRARY_FIELD="none" ;;
esac

declare ANIM_PACKAGE=""
declare ANIM_PACKAGE_VERSION=""
declare ANIM_CSS_IMPORT=""        # injected into globals.css if applicable
case "$ANIMATIONS" in
  tw-animate)
    ANIM_PACKAGE="tw-animate-css"; ANIM_PACKAGE_VERSION="^1.4.0"; ANIM_CSS_IMPORT='@import "tw-animate-css";' ;;
  framer)
    ANIM_PACKAGE="framer-motion"; ANIM_PACKAGE_VERSION="^11.15.0"; ANIM_CSS_IMPORT="" ;;
  motion)
    ANIM_PACKAGE="motion"; ANIM_PACKAGE_VERSION="^11.15.0"; ANIM_CSS_IMPORT="" ;;
  auto-animate)
    ANIM_PACKAGE="@formkit/auto-animate"; ANIM_PACKAGE_VERSION="^0.8.2"; ANIM_CSS_IMPORT="" ;;
  react-spring)
    ANIM_PACKAGE="@react-spring/web"; ANIM_PACKAGE_VERSION="^9.7.5"; ANIM_CSS_IMPORT="" ;;
  none)
    ANIM_PACKAGE=""; ANIM_PACKAGE_VERSION=""; ANIM_CSS_IMPORT="" ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then echo "ERR: not inside a git repo" >&2; exit 2; fi

APP_DIR="$REPO_ROOT/apps/$TARGET"
if [[ ! -d "$APP_DIR" ]]; then
  echo "ERR: target app dir missing: $APP_DIR" >&2
  exit 3
fi

TEMPLATES_DIR="$REPO_ROOT/squads/design-ops/templates"

# Verify required templates exist before scaffolding (fail fast, don't half-scaffold).
REQUIRED_TEMPLATES=(
  "check-token-drift.mjs.tmpl"
  "focus-indicators-global.css.tmpl"
)
if [[ "$PROFILE" == "full" ]]; then
  REQUIRED_TEMPLATES+=("build-manifest.mjs.tmpl")
fi
for tmpl in "${REQUIRED_TEMPLATES[@]}"; do
  if [[ ! -f "$TEMPLATES_DIR/$tmpl" ]]; then
    echo "ERR: required template missing: $TEMPLATES_DIR/$tmpl" >&2
    echo "     Archetype v2.0.0 mandatory_outputs cannot be fulfilled without templates." >&2
    exit 5
  fi
done

echo "━━━ scaffold-ds.sh v2.1.0 ━━━"
echo "repo:       $REPO_ROOT"
echo "target:     $APP_DIR"
echo "framework:  $FRAMEWORK"
echo "profile:    $PROFILE"
echo "icons:      $ICONS$([ -n "$ICON_PACKAGE" ] && echo " ($ICON_PACKAGE@$ICON_PACKAGE_VERSION)")"
echo "animations: $ANIMATIONS$([ -n "$ANIM_PACKAGE" ] && echo " ($ANIM_PACKAGE@$ANIM_PACKAGE_VERSION)")"
echo "source:     $SOURCE_DIR"
echo ""

# ─── 1. Move legacy dirs (framework-agnostic) ───────────────────────────────
if [[ "$SKIP_LEGACY_MOVE" -eq 0 ]]; then
  mkdir -p "$APP_DIR/legacy-static"
  for legacy in preview ui_kits screenshots uploads colors_and_type.css; do
    if [[ -e "$APP_DIR/$legacy" && ! -e "$APP_DIR/legacy-static/$legacy" ]]; then
      mv "$APP_DIR/$legacy" "$APP_DIR/legacy-static/$legacy"
      echo "moved → legacy-static/$legacy"
    fi
  done
else
  echo "skip legacy move"
fi

# ─── 2. Config files — framework-dependent ──────────────────────────────────

if [[ "$FRAMEWORK" == "next" ]]; then
  # Build conditional dependency lines (icons + animations are brand-driven; "none" → omit)
  ICON_DEP_LINE=""
  [[ -n "$ICON_PACKAGE" ]] && ICON_DEP_LINE="    \"$ICON_PACKAGE\": \"$ICON_PACKAGE_VERSION\",
"
  ANIM_DEP_LINE=""
  [[ -n "$ANIM_PACKAGE" ]] && ANIM_DEP_LINE="    \"$ANIM_PACKAGE\": \"$ANIM_PACKAGE_VERSION\",
"

  cat >"$APP_DIR/package.json" <<PKG
{
  "name": "$TARGET",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "check:drift": "node scripts/check-token-drift.mjs"
  },
  "dependencies": {
    "@swc/helpers": "^0.5.15",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
${ICON_DEP_LINE}    "next": "16.1.6",
    "next-themes": "^0.4.6",
    "radix-ui": "^1.4.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.4.0"$([ -n "$ANIM_PACKAGE" ] && echo ",
    \"$ANIM_PACKAGE\": \"$ANIM_PACKAGE_VERSION\"")
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
PKG

  cat >"$APP_DIR/next.config.ts" <<'NXT'
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
NXT

  cat >"$APP_DIR/next-env.d.ts" <<'NED'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
// This file should not be edited.
NED

  cat >"$APP_DIR/eslint.config.mjs" <<'ESL'
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];
export default eslintConfig;
ESL

  SHADCN_RSC="true"
  GLOBALS_CSS_PATH="src/app/globals.css"

elif [[ "$FRAMEWORK" == "vite" ]]; then
  ICON_DEP_LINE=""
  [[ -n "$ICON_PACKAGE" ]] && ICON_DEP_LINE="    \"$ICON_PACKAGE\": \"$ICON_PACKAGE_VERSION\",
"

  cat >"$APP_DIR/package.json" <<PKG
{
  "name": "$TARGET",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "check:drift": "node scripts/check-token-drift.mjs"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
${ICON_DEP_LINE}    "next-themes": "^0.4.6",
    "radix-ui": "^1.4.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-router-dom": "^7.0.0",
    "tailwind-merge": "^3.4.0"$([ -n "$ANIM_PACKAGE" ] && echo ",
    \"$ANIM_PACKAGE\": \"$ANIM_PACKAGE_VERSION\"")
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@tailwindcss/vite": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^9",
    "eslint-plugin-react-hooks": "^5",
    "eslint-plugin-react-refresh": "^0.4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vite": "^5"
  }
}
PKG

  cat >"$APP_DIR/vite.config.ts" <<'VIT'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
VIT

  cat >"$APP_DIR/index.html" <<IDX
<!doctype html>
<html lang="en" suppressHydrationWarning>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$TARGET</title>
    <script>
      // Synchronous theme class injection — prevents FOUC before React hydrates.
      (function () {
        try {
          var stored = localStorage.getItem('theme');
          var preferred = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          if (preferred === 'dark') document.documentElement.classList.add('dark');
        } catch (_) {}
      })();
    </script>
  </head>
  <body suppressHydrationWarning>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
IDX

  cat >"$APP_DIR/eslint.config.mjs" <<'ESL'
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  }
);
ESL

  SHADCN_RSC="false"
  GLOBALS_CSS_PATH="src/index.css"
fi

# ─── 3. tsconfig.json — framework-agnostic paths + strict ──────────────────

if [[ "$FRAMEWORK" == "next" ]]; then
  cat >"$APP_DIR/tsconfig.json" <<'TSC'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules", "legacy-static"]
}
TSC
else
  cat >"$APP_DIR/tsconfig.json" <<'TSC'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] },
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "legacy-static", "dist"]
}
TSC
fi

# ─── 4. postcss.config.mjs (agnostic — Tailwind v4 PostCSS plugin) ─────────
cat >"$APP_DIR/postcss.config.mjs" <<'PCS'
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
PCS

# ─── 5. components.json — shadcn config (framework-dependent rsc flag) ─────
cat >"$APP_DIR/components.json" <<CJS
{
  "\$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": $SHADCN_RSC,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "$GLOBALS_CSS_PATH",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "$ICON_LIBRARY_FIELD"
}
CJS

# ─── 6. .gitignore ──────────────────────────────────────────────────────────
cat >"$APP_DIR/.gitignore" <<'GIT'
node_modules
.pnp
.pnp.js
.next
dist
out
*.tsbuildinfo
.DS_Store
*.pem
.vercel
.env*.local
GIT

echo "configs written (framework=$FRAMEWORK, rsc=$SHADCN_RSC)"

# ─── 7. src/ skeleton — framework-dependent ─────────────────────────────────

mkdir -p "$APP_DIR/src/components/ui" \
         "$APP_DIR/src/lib" \
         "$APP_DIR/src/styles" \
         "$APP_DIR/src/hooks" \
         "$APP_DIR/src/design-system" \
         "$APP_DIR/scripts" \
         "$APP_DIR/public"

cat >"$APP_DIR/src/lib/utils.ts" <<'UTL'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
UTL

if [[ "$FRAMEWORK" == "next" ]]; then
  mkdir -p "$APP_DIR/src/app"

  cat >"$APP_DIR/src/app/globals.css" <<CSS
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
@import "tailwindcss";
${ANIM_CSS_IMPORT}
@source "../**/*.{ts,tsx,mdx}";

/* Dark variant — \`.dark\` on any ancestor activates \`dark:\` utilities. */
@custom-variant dark (&:is(.dark *));

/* __FOCUS_INDICATORS_GLOBAL_PLACEHOLDER__ — replaced below by scaffold. */

/* Tokens are wired in Organism 2 (Token System) of the migration workflow. */
CSS

  cat >"$APP_DIR/src/app/layout.tsx" <<'LYT'
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Design System",
  description: "DS scaffolded via design-ops archetype v2.0.0 (framework=next).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
LYT

  cat >"$APP_DIR/src/app/page.tsx" <<'PGE'
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-medium">Design System</h1>
      <p className="mt-4 text-neutral-600">
        Scaffolded via design-ops archetype v2.0.0. Tokens wired in Organism 2. Primitives in Organism 3.
      </p>
    </main>
  );
}
PGE

  cat >"$APP_DIR/src/components/theme-provider.tsx" <<'TP'
"use client";
import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
TP

elif [[ "$FRAMEWORK" == "vite" ]]; then
  cat >"$APP_DIR/src/index.css" <<CSS
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
@import "tailwindcss";
${ANIM_CSS_IMPORT}
@source "./**/*.{ts,tsx,mdx}";

/* Dark variant — \`.dark\` on any ancestor activates \`dark:\` utilities. */
@custom-variant dark (&:is(.dark *));

/* __FOCUS_INDICATORS_GLOBAL_PLACEHOLDER__ — replaced below by scaffold. */

/* Tokens are wired in Organism 2 (Token System) of the migration workflow. */
CSS

  cat >"$APP_DIR/src/main.tsx" <<'MN'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <App />
    </ThemeProvider>
  </StrictMode>
);
MN

  cat >"$APP_DIR/src/App.tsx" <<'APP'
export default function App() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-medium">Design System</h1>
      <p className="mt-4 text-neutral-600">
        Scaffolded via design-ops archetype v2.0.0 (framework=vite). Tokens wired in Organism 2. Primitives in Organism 3.
      </p>
    </main>
  );
}
APP

  cat >"$APP_DIR/src/vite-env.d.ts" <<'VDT'
/// <reference types="vite/client" />
VDT
fi

echo "src/ skeleton ready ($FRAMEWORK)"

# ─── 8. MANDATORY OUTPUTS — baseline (all profiles, all frameworks) ────────

echo ""
echo "━━━ archetype v2.0.0 mandatory_outputs (baseline) ━━━"

# 8a. check-token-drift.mjs from template
cp "$TEMPLATES_DIR/check-token-drift.mjs.tmpl" "$APP_DIR/scripts/check-token-drift.mjs"
echo "dropped   scripts/check-token-drift.mjs (from template)"

# 8b. components.map.json skeleton with status field
cat >"$APP_DIR/src/design-system/components.map.json" <<CMP
{
  "\$schema": "https://raw.githubusercontent.com/sinkra-hub/design-ops/components-map-v1.schema.json",
  "version": "1.0.0",
  "target": "$TARGET",
  "framework": "$FRAMEWORK",
  "profile": "$PROFILE",
  "components": {
    "_instructions": "One entry per component in src/components/ui/. Every entry MUST have { status, a11y }. status ∈ {ready|beta|experimental|deprecated}. a11y = { role, keyboard, aria, focus, notes }.",
    "_example": {
      "button": {
        "status": "ready",
        "path": "src/components/ui/button.tsx",
        "a11y": { "role": "button", "keyboard": "Space/Enter activates", "aria": "aria-label on icon-only", "focus": "outline 3px offset 3px (global rule)", "notes": "" }
      }
    }
  }
}
CMP
echo "dropped   src/design-system/components.map.json (skeleton)"

# 8c. Inject focus-indicators-global into globals.css
FOCUS_TMPL="$TEMPLATES_DIR/focus-indicators-global.css.tmpl"
FOCUS_CONTENT=$(cat "$FOCUS_TMPL")
python3 - "$APP_DIR/$GLOBALS_CSS_PATH" "$FOCUS_TMPL" <<'PY'
import sys
target = sys.argv[1]
tmpl   = sys.argv[2]
with open(tmpl, "r") as f: focus = f.read()
with open(target, "r") as f: css = f.read()
placeholder = "/* __FOCUS_INDICATORS_GLOBAL_PLACEHOLDER__ — replaced below by scaffold. */"
if placeholder in css:
    css = css.replace(placeholder, focus.rstrip())
    with open(target, "w") as f: f.write(css)
    print(f"injected  focus-indicators-global into {target}")
else:
    print(f"warn: placeholder not found in {target}; appending", file=sys.stderr)
    with open(target, "a") as f: f.write("\n" + focus)
PY

# ─── 9. MANDATORY OUTPUTS — full_only (profile=full) ───────────────────────

if [[ "$PROFILE" == "full" ]]; then
  echo ""
  echo "━━━ archetype v2.0.0 mandatory_outputs (full_only) ━━━"

  # 9a. build-manifest.mjs from template
  cp "$TEMPLATES_DIR/build-manifest.mjs.tmpl" "$APP_DIR/scripts/build-manifest.mjs"
  echo "dropped   scripts/build-manifest.mjs (from template)"

  # 9b. tokens.dtcg.json skeleton (empty DTCG)
  mkdir -p "$APP_DIR/src/design-system/exports"
  cat >"$APP_DIR/src/design-system/exports/tokens.dtcg.json" <<DTCG
{
  "\$schema": "https://tr.designtokens.org/format/",
  "_meta": {
    "generator": "design-ops scaffold-ds.sh v2.0.0",
    "target": "$TARGET",
    "framework": "$FRAMEWORK",
    "note": "Emit real tokens via build-tokens.mjs (not yet authored — stub file). DTCG format: {\\\"token-name\\\": {\\\"\$value\\\": ..., \\\"\$type\\\": ..., \\\"\$description\\\": ...}}"
  }
}
DTCG
  echo "dropped   src/design-system/exports/tokens.dtcg.json (skeleton)"

  # 9c. Inject designTokensLanguageServer + scripts into package.json
  node - "$APP_DIR/package.json" <<'NODE'
const fs = require("fs");
const p = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
pkg.scripts["build:manifest"] = "node scripts/build-manifest.mjs";
pkg.scripts["build:tokens"] = "echo 'build:tokens: author scripts/build-tokens.mjs to emit DTCG'";
pkg.designTokensLanguageServer = {
  prefix: "",
  tokensFiles: ["./src/design-system/exports/tokens.dtcg.json"]
};
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
console.log("enriched  package.json with designTokensLanguageServer + build:manifest + build:tokens");
NODE

  # 9d. Storybook deps per framework (add to devDependencies)
  if [[ "$FRAMEWORK" == "next" ]]; then
    STORYBOOK_FRAMEWORK_DEP="@storybook/nextjs-vite"
  else
    STORYBOOK_FRAMEWORK_DEP="@storybook/react-vite"
  fi
  node - "$APP_DIR/package.json" "$STORYBOOK_FRAMEWORK_DEP" <<'NODE'
const fs = require("fs");
const [p, sbFw] = [process.argv[2], process.argv[3]];
const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
Object.assign(pkg.devDependencies, {
  storybook: "^10.2.12",
  [sbFw]: "^10.2.12",
  "@storybook/addon-a11y": "^10.2.16",
  "@storybook/addon-docs": "^10.2.12",
  "@storybook/addon-themes": "^10.2.16",
  "@chromatic-com/storybook": "^5.0.1",
  "@playwright/test": "^1.50.0",
});
pkg.scripts.storybook = "storybook dev -p 6007";
pkg.scripts["build-storybook"] = "storybook build";
pkg.scripts["test:visual"] = "playwright test";
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
console.log("enriched  package.json with Storybook + Playwright (framework=" + (sbFw.includes("next") ? "next" : "vite") + ")");
NODE
fi

# ─── 10. Public assets ─────────────────────────────────────────────────────

if [[ -d "$APP_DIR/assets" && ! -d "$APP_DIR/public/assets" ]]; then
  cp -R "$APP_DIR/assets" "$APP_DIR/public/assets"
  echo "copied    assets/ → public/assets/"
fi

# ─── 11. Install deps ──────────────────────────────────────────────────────

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo ""
  echo "running npm install (this takes a minute)..."
  ( cd "$APP_DIR" && npm install ) || { echo "ERR: npm install failed" >&2; exit 4; }
else
  echo "skip npm install"
fi

echo ""
echo "━━━ scaffold complete ━━━"
echo "framework:  $FRAMEWORK"
echo "profile:    $PROFILE"
echo "icons:      $ICONS$([ -n "$ICON_PACKAGE" ] && echo " → $ICON_PACKAGE")"
echo "animations: $ANIMATIONS$([ -n "$ANIM_PACKAGE" ] && echo " → $ANIM_PACKAGE")"
echo "entry:      $([ "$FRAMEWORK" = "next" ] && echo "src/app/layout.tsx + src/app/page.tsx" || echo "src/main.tsx + src/App.tsx")"
echo "globals:    $GLOBALS_CSS_PATH"
echo "drift:      node scripts/check-token-drift.mjs"
[ "$PROFILE" = "full" ] && echo "manifest:   node scripts/build-manifest.mjs"
echo ""
echo "next step: wire tokens from legacy-static/ into $GLOBALS_CSS_PATH (Organism 2 of the workflow)."
