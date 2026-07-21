#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SCRIPT_PATH = path.relative(process.cwd(), __filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DESIGN_APP_ROOT = path.join(REPO_ROOT, "apps/design");
const DESIGNS_INDEX = path.join(DESIGN_APP_ROOT, "src/data/designs-index.generated.json");
const DESIGNS_SRC_ROOT = path.join(DESIGN_APP_ROOT, "src/data/designs");
const EXTRACTS_ROOT = path.join(REPO_ROOT, "outputs/design-ops/url-extracts");

function parseArgs(argv) {
  const args = {
    apply: false,
    brands: null,
    all: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--dry-run") {
      args.apply = false;
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg === "--brands") {
      args.brands = splitCsv(argv[++index]);
    } else if (arg.startsWith("--brands=")) {
      args.brands = splitCsv(arg.slice("--brands=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  console.log(`Usage:
  node ${SCRIPT_PATH} --dry-run
  node ${SCRIPT_PATH} --apply

Fixes only:
  preview.defaultMode: "light" -> "dark"

Required evidence:
  outputs/design-ops/url-extracts/<slug>/render-contract.json says dark
  apps/design/src/data/designs/<slug>/preview.json has modes.dark`);
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeMode(value) {
  const mode = String(value || "").toLowerCase();
  return mode === "light" || mode === "dark" ? mode : null;
}

function loadBrandSlugs(args) {
  if (args.brands?.length) return [...new Set(args.brands)];
  const index = readJson(DESIGNS_INDEX, []);
  return index.map((entry) => entry.id).filter(Boolean);
}

function inspectBrand(slug) {
  const previewPath = path.join(DESIGNS_SRC_ROOT, slug, "preview.json");
  const renderContractPath = path.join(EXTRACTS_ROOT, slug, "render-contract.json");
  const preview = readJson(previewPath, null);
  const renderContract = readJson(renderContractPath, null);

  if (!preview) {
    return { slug, status: "skip", reason: "missing-preview", previewPath };
  }
  if (!renderContract) {
    return { slug, status: "skip", reason: "missing-render-contract", previewPath, renderContractPath };
  }

  const runtimeDefault = normalizeMode(preview.defaultMode || "light");
  const renderDefault = normalizeMode(renderContract.theme?.default_mode || renderContract.theme?.default);
  if (renderDefault !== "dark" || runtimeDefault !== "light") {
    return { slug, status: "noop", runtimeDefault, renderDefault, previewPath, renderContractPath };
  }
  if (!preview.modes?.dark) {
    return { slug, status: "skip", reason: "missing-dark-mode", runtimeDefault, renderDefault, previewPath, renderContractPath };
  }

  return {
    slug,
    status: "change",
    from: runtimeDefault,
    to: renderDefault,
    previewPath,
    renderContractPath,
    renderSurface: renderContract.theme?.surface || null,
    detectorConfidence: renderContract.theme?.confidence || null,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const slugs = loadBrandSlugs(args);
  const results = slugs.map(inspectBrand);
  const changes = results.filter((result) => result.status === "change");
  const skipped = results.filter((result) => result.status === "skip");

  if (args.apply) {
    for (const change of changes) {
      const preview = readJson(change.previewPath, null);
      preview.defaultMode = "dark";
      writeJson(change.previewPath, preview);
    }
  }

  console.log(`[fix-theme-default-drift] mode=${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`[fix-theme-default-drift] scanned=${results.length} changes=${changes.length} skipped=${skipped.length}`);
  for (const change of changes) {
    console.log(`  ${args.apply ? "fixed" : "would fix"} ${change.slug}: defaultMode ${change.from} -> ${change.to}`);
  }
  if (skipped.length) {
    console.log("[fix-theme-default-drift] skipped:");
    for (const item of skipped) {
      console.log(`  ${item.slug}: ${item.reason}`);
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[fix-theme-default-drift] ${error.message}`);
    process.exitCode = 1;
  }
}

