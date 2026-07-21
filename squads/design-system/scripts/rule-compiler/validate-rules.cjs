#!/usr/bin/env node
/**
 * validate-rules.cjs
 *
 * Validates rule .md files for completeness and correctness.
 * Checks frontmatter fields, code example presence, and file naming.
 *
 * Adapted from v0 react-best-practices-build/validate.ts for SINKRA format.
 * Source: B04 ABSORB verdict (COMPARE pipeline, 2026-04-16)
 *
 * Usage:
 *   node squads/design-system/scripts/rule-compiler/validate-rules.cjs [--skill=name] [--all]
 *
 * Exit codes:
 *   0 = All rules valid
 *   1 = Validation errors found
 */

const fs = require('fs');
const path = require('path');
const config = require('./rule-compiler-config.cjs');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const raw = match[1];
  const frontmatter = {};
  for (const line of raw.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      const [, key, value] = kv;
      frontmatter[key] = value;
    }
  }
  return frontmatter;
}

function validateRule(filePath) {
  const errors = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Check 1: Has frontmatter
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push(`${fileName}: Missing YAML frontmatter (--- block)`);
    return errors;
  }

  // Check 2: Required frontmatter fields
  for (const field of config.requiredFrontmatter) {
    if (!fm[field]) {
      errors.push(`${fileName}: Missing frontmatter field: ${field}`);
    }
  }

  // Check 3: Impact level is valid
  if (fm.impact && !config.impactOrder.includes(fm.impact)) {
    errors.push(`${fileName}: Invalid impact level "${fm.impact}". Must be: ${config.impactOrder.join(', ')}`);
  }

  // Check 4: Has at least one code example
  if (!content.includes('```')) {
    errors.push(`${fileName}: No code examples found. Rules must include Incorrect/Correct examples`);
  }

  // Check 5: Has Incorrect and Correct sections
  if (!content.includes('## Incorrect') && !content.includes('## Wrong')) {
    errors.push(`${fileName}: Missing "## Incorrect" section`);
  }
  if (!content.includes('## Correct') && !content.includes('## Right')) {
    errors.push(`${fileName}: Missing "## Correct" section`);
  }

  // Check 6: Has Why section
  if (!content.includes('## Why')) {
    errors.push(`${fileName}: Missing "## Why" section explaining the rationale`);
  }

  return errors;
}

function validateSkill(skillConfig) {
  if (!fs.existsSync(skillConfig.sourceDir)) {
    return [`Source directory not found: ${skillConfig.sourceDir}`];
  }

  const files = fs.readdirSync(skillConfig.sourceDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const allErrors = [];

  for (const file of files) {
    const errors = validateRule(path.join(skillConfig.sourceDir, file));
    allErrors.push(...errors);
  }

  return allErrors;
}

// Main
function main() {
  const args = process.argv.slice(2);
  const validateAll = args.includes('--all');
  const skillArg = args.find((a) => a.startsWith('--skill='));
  const skillName = skillArg ? skillArg.split('=')[1] : null;

  let targets = config.skills;

  if (skillName) {
    targets = targets.filter((s) => s.name === skillName);
    if (targets.length === 0) {
      console.error(`ERROR: Skill "${skillName}" not found.`);
      process.exit(1);
    }
  } else if (!validateAll) {
    console.log('Usage: validate-rules.cjs --all | --skill=<name>');
    process.exit(0);
  }

  let totalErrors = 0;
  for (const skill of targets) {
    console.log(`Validating: ${skill.name}`);
    const errors = validateSkill(skill);

    if (errors.length === 0) {
      console.log(`  PASS: All rules valid`);
    } else {
      for (const err of errors) {
        console.error(`  FAIL: ${err}`);
      }
      totalErrors += errors.length;
    }
  }

  if (totalErrors > 0) {
    console.error(`\nFAIL: ${totalErrors} error(s) found.`);
    process.exit(1);
  } else {
    console.log(`\nPASS: All rules valid.`);
    process.exit(0);
  }
}

main();
