#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const PROMPTS = [
  'qa-api', 'qa-ui', 'qa-env', 'qa-sec',
  'qa-perf', 'qa-int', 'qa-ci', 'qa-reg', 'qa-rv'
];

const PLATFORMS = {
  'claude': {
    name: 'Claude Code',
    dir: '.claude/commands',
    ext: '.md',
    detect: () => fs.existsSync(path.join(process.cwd(), '.claude')),
  },
  'cursor': {
    name: 'Cursor',
    dir: '.cursor/rules',
    ext: '.md',
    detect: () => fs.existsSync(path.join(process.cwd(), '.cursor')),
  },
  'windsurf': {
    name: 'Windsurf',
    dir: '.windsurf/rules',
    ext: '.md',
    detect: () => fs.existsSync(path.join(process.cwd(), '.windsurf')),
  },
  'copilot': {
    name: 'GitHub Copilot',
    dir: '.github',
    ext: '.md',
    detect: () => fs.existsSync(path.join(process.cwd(), '.github')),
    single: true, // all prompts go into one instructions file
  },
  'generic': {
    name: 'Generic (prompts/ directory)',
    dir: 'prompts',
    ext: '.md',
    detect: () => true,
  },
};

function printHelp() {
  console.log(`
  qa-testing-skills — AI-powered QA testing prompts for any agent

  Usage:
    npx @aktibaba/qa-testing-skills init [platform]    Install prompts into your project
    npx @aktibaba/qa-testing-skills list               List available prompts
    npx @aktibaba/qa-testing-skills help               Show this help

  Platforms:
    claude      → .claude/commands/     (use as /qa-api, /qa-ui, etc.)
    cursor      → .cursor/rules/
    windsurf    → .windsurf/rules/
    copilot     → .github/copilot-instructions.md
    generic     → prompts/              (copy-paste into any AI tool)

  Examples:
    npx @aktibaba/qa-testing-skills init              Auto-detect platform
    npx @aktibaba/qa-testing-skills init claude       Install for Claude Code
    npx @aktibaba/qa-testing-skills init generic      Install as plain markdown files
`);
}

function listPrompts() {
  console.log('\n  Available QA Testing Prompts:\n');
  const descriptions = {
    'qa-api':  'API Testing — REST, GraphQL, gRPC test suites',
    'qa-ui':   'UI/E2E Testing — Browser automation, Playwright/Cypress',
    'qa-env':  'Docker Environment — Reproducible test environments',
    'qa-sec':  'Security Testing — OWASP Top 10, vulnerability scanning',
    'qa-perf': 'Performance Testing — Load, stress, spike tests',
    'qa-int':  'Integration Testing — Service interactions, contracts',
    'qa-ci':   'CI/CD Pipeline — Quality pipeline with test stages',
    'qa-reg':  'Regression Testing — Suite organization, smoke/sanity/full',
    'qa-rv':   'Test Review — Quality scoring and best practices audit',
  };
  for (const [key, desc] of Object.entries(descriptions)) {
    console.log(`    ${key.padEnd(12)} ${desc}`);
  }
  console.log('');
}

function detectPlatform() {
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    if (key === 'generic') continue;
    if (platform.detect()) {
      return key;
    }
  }
  return 'generic';
}

function copyPrompts(platformKey) {
  const platform = PLATFORMS[platformKey];
  const targetDir = path.join(process.cwd(), platform.dir);

  // Create target directory
  fs.mkdirSync(targetDir, { recursive: true });

  if (platform.single) {
    // Copilot: merge all prompts into one file
    const targetFile = path.join(targetDir, 'copilot-instructions.md');
    let content = '# QA Testing Skills — Copilot Instructions\n\n';
    content += 'Use the appropriate section below based on the testing task.\n\n---\n\n';

    for (const name of PROMPTS) {
      const src = path.join(PROMPTS_DIR, `${name}.md`);
      content += fs.readFileSync(src, 'utf-8') + '\n\n---\n\n';
    }
    fs.writeFileSync(targetFile, content);
    console.log(`  Written: ${path.relative(process.cwd(), targetFile)}`);
  } else {
    // All other platforms: one file per prompt
    let count = 0;
    for (const name of PROMPTS) {
      const src = path.join(PROMPTS_DIR, `${name}.md`);
      const dest = path.join(targetDir, `${name}${platform.ext}`);
      fs.copyFileSync(src, dest);
      count++;
    }
    console.log(`  Written: ${count} prompt files to ${platform.dir}/`);
  }
}

function init(platformArg) {
  const platformKey = platformArg || detectPlatform();
  const platform = PLATFORMS[platformKey];

  if (!platform) {
    console.error(`  Unknown platform: ${platformArg}`);
    console.error(`  Available: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n  QA Testing Skills — Installing for ${platform.name}\n`);
  copyPrompts(platformKey);

  console.log('');
  if (platformKey === 'claude') {
    console.log('  Usage in Claude Code:');
    console.log('    /qa-api     → Generate API tests');
    console.log('    /qa-ui      → Generate E2E tests');
    console.log('    /qa-env     → Setup Docker test environment');
    console.log('    /qa-sec     → Security test suite');
    console.log('    /qa-perf    → Performance test suite');
    console.log('    /qa-int     → Integration test suite');
    console.log('    /qa-ci      → CI/CD pipeline with quality gates');
    console.log('    /qa-reg     → Organize regression suite');
    console.log('    /qa-rv      → Review test quality');
  } else if (platformKey === 'generic') {
    console.log('  Prompt files saved to prompts/ directory.');
    console.log('  Copy-paste any file into your AI tool of choice.');
  } else {
    console.log(`  Prompt files installed to ${platform.dir}/`);
    console.log('  Your AI tool will automatically pick them up.');
  }
  console.log('\n  Done!\n');
}

// CLI entry point
const [,, command, ...args] = process.argv;

switch (command) {
  case 'init':
    init(args[0]);
    break;
  case 'list':
    listPrompts();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;
  default:
    console.error(`  Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
