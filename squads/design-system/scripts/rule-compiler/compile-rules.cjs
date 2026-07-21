#!/usr/bin/env node
/**
 * compile-rules.cjs
 *
 * Rule compilation pipeline. Reads individual rule .md files from source directories,
 * parses frontmatter and content, sorts by impact, and produces a single compiled
 * markdown file suitable for agent consumption (injected as knowledge base).
 *
 * Adapted from v0 react-best-practices-build/build.ts for SINKRA format.
 * Source: B04 ABSORB verdict (COMPARE pipeline, 2026-04-16)
 *
 * Usage:
 *   node squads/design-system/scripts/rule-compiler/compile-rules.cjs [--skill=name] [--all]
 *
 * Options:
 *   --skill=react-rules    Compile a single skill
 *   --all                  Compile all configured skills
 *   --dry-run              Show what would be compiled without writing
 */

const fs = require('fs');
const path = require('path');
const config = require('./rule-compiler-config.cjs');

/**
 * Parse YAML-like frontmatter from a markdown file.
 * Handles: title, impact, tags (as array), sinkra_source.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const raw = match[1];
  const frontmatter = {};

  for (const line of raw.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      const [, key, value] = kv;
      if (value.startsWith('[') && value.endsWith(']')) {
        // Parse array: [react, patterns, ...]
        frontmatter[key] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim());
      } else {
        frontmatter[key] = value;
      }
    }
  }

  const body = content.slice(match[0].length).trim();
  return { frontmatter, body };
}

/**
 * Read all rule files from a directory.
 */
function readRules(sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    console.error(`ERROR: Source directory not found: ${sourceDir}`);
    return [];
  }

  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const rules = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    rules.push({
      file,
      frontmatter,
      body,
    });
  }

  return rules;
}

/**
 * Sort rules by impact (high > medium > low).
 */
function sortByImpact(rules) {
  const order = config.impactOrder;
  return [...rules].sort((a, b) => {
    const ai = order.indexOf(a.frontmatter.impact || 'low');
    const bi = order.indexOf(b.frontmatter.impact || 'low');
    return ai - bi;
  });
}

/**
 * Compile rules into a single markdown document.
 */
function compileSkill(skillConfig) {
  const rules = readRules(skillConfig.sourceDir);
  if (rules.length === 0) {
    console.warn(`WARN: No rules found in ${skillConfig.sourceDir}`);
    return null;
  }

  const sorted = sortByImpact(rules);
  const lines = [
    `# ${skillConfig.description}`,
    '',
    `> Compiled from ${sorted.length} rules in ${path.basename(skillConfig.sourceDir)}/`,
    `> Generated: ${new Date().toISOString().split('T')[0]}`,
    `> Compiler: compile-rules.cjs (SINKRA rule-compiler)`,
    '',
    '---',
    '',
  ];

  for (let i = 0; i < sorted.length; i++) {
    const rule = sorted[i];
    const fm = rule.frontmatter;
    lines.push(`${skillConfig.sectionPrefix} ${i + 1}: ${fm.title || rule.file}`);
    lines.push('');
    if (fm.impact) lines.push(`**Impact:** ${fm.impact}`);
    if (fm.tags) lines.push(`**Tags:** ${Array.isArray(fm.tags) ? fm.tags.join(', ') : fm.tags}`);
    lines.push('');
    lines.push(rule.body);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// Main
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const compileAll = args.includes('--all');
  const skillArg = args.find((a) => a.startsWith('--skill='));
  const skillName = skillArg ? skillArg.split('=')[1] : null;

  let targets = config.skills;

  if (skillName) {
    targets = targets.filter((s) => s.name === skillName);
    if (targets.length === 0) {
      console.error(`ERROR: Skill "${skillName}" not found in config.`);
      console.error(`Available: ${config.skills.map((s) => s.name).join(', ')}`);
      process.exit(1);
    }
  } else if (!compileAll) {
    console.log('Usage: compile-rules.cjs --all | --skill=<name> [--dry-run]');
    console.log(`Available skills: ${config.skills.map((s) => s.name).join(', ')}`);
    process.exit(0);
  }

  let compiled = 0;
  for (const skill of targets) {
    console.log(`Compiling: ${skill.name} (${skill.sourceDir})`);
    const output = compileSkill(skill);

    if (!output) continue;

    if (dryRun) {
      console.log(`  DRY RUN: Would write ${output.length} chars to ${skill.outputPath}`);
    } else {
      const outDir = path.dirname(skill.outputPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(skill.outputPath, output, 'utf-8');
      console.log(`  DONE: ${skill.outputPath} (${output.length} chars)`);
    }
    compiled++;
  }

  console.log(`\nCompiled ${compiled} skill(s).`);
}

main();
