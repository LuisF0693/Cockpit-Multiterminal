#!/usr/bin/env node
/**
 * validate_data_sot.cjs
 *
 * Enforces the single-SOT rule for design system data:
 *   - squads/design-system/data/ is the ONLY location for design data
 *   - squads/aiox-design/data/ must NOT exist or contain files
 *
 * Exit codes:
 *   0 = PASS (no violations)
 *   1 = FAIL (data files found in aiox-design/data/)
 *
 * Usage:
 *   node squads/design-system/scripts/validate_data_sot.cjs
 *
 * ADR: ADR-001-unified-data-layer.md
 * Story: A21 TRANSCEND (v0-design-pipeline compare pipeline)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FORBIDDEN_DIR = path.join(ROOT, 'squads', 'aiox-design', 'data');
const SOT_DIR = path.join(ROOT, 'squads', 'design-system', 'data');

function validate() {
  const violations = [];

  // Check 1: aiox-design/data/ must not exist or must be empty
  if (fs.existsSync(FORBIDDEN_DIR)) {
    try {
      const files = fs.readdirSync(FORBIDDEN_DIR).filter(f => !f.startsWith('.'));
      if (files.length > 0) {
        violations.push({
          type: 'FORBIDDEN_DATA_FILES',
          path: FORBIDDEN_DIR,
          files,
          message: `Found ${files.length} file(s) in aiox-design/data/. All design data must live in design-system/data/.`
        });
      }
    } catch (err) {
      // Directory exists but cannot be read -- treat as violation
      violations.push({
        type: 'FORBIDDEN_DIR_ACCESS',
        path: FORBIDDEN_DIR,
        message: `Cannot read aiox-design/data/: ${err.message}`
      });
    }
  }

  // Check 2: SOT directories must exist
  const requiredDirs = [
    path.join(SOT_DIR, 'knowledge'),
    path.join(SOT_DIR, 'registries')
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      violations.push({
        type: 'MISSING_SOT_DIR',
        path: dir,
        message: `Required SOT directory missing: ${path.relative(ROOT, dir)}`
      });
    }
  }

  // Check 3: registries/ must contain at least the 7 core registry files
  const expectedRegistries = [
    'design-system-infrastructure-map.yaml',
    'design-system-service-catalog.yaml',
    'ds-page-types-registry.yaml',
    'map-generated-infrastructure-connections.yaml',
    'motion-primitives-registry.yaml',
    'quality-gates.yaml',
    'token-registry.yaml'
  ];

  const registriesDir = path.join(SOT_DIR, 'registries');
  if (fs.existsSync(registriesDir)) {
    const actual = fs.readdirSync(registriesDir);
    for (const expected of expectedRegistries) {
      if (!actual.includes(expected)) {
        violations.push({
          type: 'MISSING_REGISTRY',
          path: path.join(registriesDir, expected),
          message: `Core registry file missing: registries/${expected}`
        });
      }
    }
  }

  return violations;
}

// Execute
const violations = validate();

if (violations.length === 0) {
  console.log('PASS: Design data SOT validation passed.');
  console.log(`  SOT: squads/design-system/data/ (knowledge/ + registries/)`);
  console.log(`  Forbidden: squads/aiox-design/data/ (not present)`);
  process.exit(0);
} else {
  console.error(`FAIL: ${violations.length} violation(s) found:\n`);
  for (const v of violations) {
    console.error(`  [${v.type}] ${v.message}`);
    if (v.files) {
      console.error(`    Files: ${v.files.join(', ')}`);
    }
  }
  process.exit(1);
}
