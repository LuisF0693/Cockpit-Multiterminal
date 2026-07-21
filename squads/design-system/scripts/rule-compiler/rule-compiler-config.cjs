/**
 * rule-compiler-config.cjs
 *
 * Configuration for the rule compilation pipeline.
 * Maps rule source directories to compiled output paths.
 *
 * Adapted from v0 react-best-practices-build/config.ts for SINKRA format.
 * Source: B04 ABSORB verdict (COMPARE pipeline, 2026-04-16)
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const KNOWLEDGE_BASE = path.join(ROOT, 'squads', 'design-system', 'data', 'knowledge');

module.exports = {
  /**
   * Each skill entry defines a rule directory and its compiled output.
   * The compiler reads all .md files (excluding README) from sourceDir,
   * parses frontmatter + content, and produces a single compiled output.
   */
  skills: [
    {
      name: 'react-rules',
      sourceDir: path.join(KNOWLEDGE_BASE, 'react-rules'),
      outputPath: path.join(ROOT, 'squads', 'design-system', 'data', 'compiled', 'react-rules.compiled.md'),
      sectionPrefix: '## React Rule',
      description: 'Compiled React best-practice rules for agent consumption',
    },
    {
      name: 'composition-rules',
      sourceDir: path.join(KNOWLEDGE_BASE, 'composition-rules'),
      outputPath: path.join(ROOT, 'squads', 'design-system', 'data', 'compiled', 'composition-rules.compiled.md'),
      sectionPrefix: '## Composition Rule',
      description: 'Compiled component composition patterns for agent consumption',
    },
  ],

  /**
   * Frontmatter fields expected in each rule .md file.
   * Used by validate-rules.cjs to check completeness.
   */
  requiredFrontmatter: ['title', 'impact', 'tags', 'sinkra_source'],

  /**
   * Impact levels (for sorting in compiled output).
   */
  impactOrder: ['high', 'medium', 'low'],
};
