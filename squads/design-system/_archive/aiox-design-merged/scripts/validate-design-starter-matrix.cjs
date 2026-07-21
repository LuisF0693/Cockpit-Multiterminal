#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = process.cwd();

function runStep(label, command, args, options = {}) {
  console.log(`== ${label} ==`);
  execFileSync(command, args, {
    cwd: options.cwd || ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
}

function assertExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

function canValidateSourceApp() {
  return (
    fs.existsSync(path.join(ROOT, "workspace.yaml")) ||
    fs.existsSync(path.join(ROOT, "workspace", "workspace.yaml"))
  );
}

function validateStandaloneExport(starterApp) {
  const exportRoot = path.join(os.tmpdir(), "aiox-design-starter-matrix-export");
  fs.rmSync(exportRoot, { recursive: true, force: true });

  runStep("Starter Standalone Export", "npm", ["run", "export:standalone", "--", `--target=${exportRoot}`], {
    cwd: starterApp,
  });

  assertExists(path.join(exportRoot, "README.md"), "standalone README");
  assertExists(path.join(exportRoot, "package.json"), "standalone package.json");
  assertExists(path.join(exportRoot, "starter", "site.config.yaml"), "standalone site config");
  assertExists(path.join(exportRoot, "src", "vendor", "brandbook-primitives", "index.ts"), "vendored primitives");
  assertExists(path.join(exportRoot, "src", "vendor", "brandbook-editorial", "index.ts"), "vendored editorial");
}

function main() {
  const sourceApp = path.join(ROOT, "apps", "ds");
  const starterApp = path.join(ROOT, "apps", "aiox-design-starter");

  if (canValidateSourceApp()) {
    runStep("Source App Build", "npm", ["run", "build"], {
      cwd: sourceApp,
      env: {
        WORKSPACE_ROOT: ROOT,
      },
    });
  } else {
    console.log("== Source App Build ==");
    console.log("SKIP: source app parity build requires workspace.yaml markers; starter validation continues");
  }
  runStep("Starter Lint", "npm", ["run", "lint"], { cwd: starterApp });
  runStep("Starter Typecheck", "npm", ["run", "typecheck"], { cwd: starterApp });
  runStep("Starter Tenant Runtime Tests", "npm", ["run", "test:tenant-runtime"], {
    cwd: starterApp,
  });
  runStep("Starter Default Build", "npm", ["run", "build"], { cwd: starterApp });
  runStep("Starter Variant2 Build", "npm", ["run", "build:variant2"], {
    cwd: starterApp,
  });
  runStep("Starter Variant3 Build", "npm", ["run", "build"], {
    cwd: starterApp,
    env: {
      STARTER_VARIANT: "variant3",
    },
  });
  validateStandaloneExport(starterApp);

  console.log("PASS: design starter matrix validated");
}

try {
  main();
} catch (error) {
  console.error("FAIL: design starter matrix validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
