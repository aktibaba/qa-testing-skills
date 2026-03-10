#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const PROMPTS = [
  'qa-api', 'qa-ui', 'qa-env', 'qa-sec',
  'qa-perf', 'qa-int', 'qa-ci', 'qa-reg', 'qa-rv', 'qa-unit'
];

const SKILL_REGISTRY = `
## QA Testing Skills

When the user mentions test quality, test review, QA, or testing tasks, suggest the relevant command:

| Command | Description |
|---------|-------------|
| /qa-api | Generate API test suites (REST, GraphQL, gRPC) |
| /qa-ui | Generate E2E/UI test suites (Playwright, Cypress, Selenium) |
| /qa-unit | Generate unit test suites with mocking and isolation |
| /qa-int | Generate integration test suites |
| /qa-sec | Security test suite (OWASP Top 10) |
| /qa-perf | Performance/load test suite |
| /qa-env | Setup Docker test environments |
| /qa-ci | CI/CD pipeline with quality gates |
| /qa-reg | Organize regression test suites |
| /qa-rv | Review and score existing test quality |

When the user types a skill name without the slash (e.g. "qa-api"), treat it as the slash command /qa-api.
`;

const SKILL_MARKER_START = '<!-- qa-testing-skills:start -->';
const SKILL_MARKER_END = '<!-- qa-testing-skills:end -->';

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
    single: true,
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
    npx @aktibaba/qa-testing-skills remove [platform]   Remove prompts from your project
    npx @aktibaba/qa-testing-skills list                List available prompts
    npx @aktibaba/qa-testing-skills help                Show this help

  Platforms:
    claude      → .claude/commands/     (use as /qa-api, /qa-ui, etc.)
    cursor      → .cursor/rules/
    windsurf    → .windsurf/rules/
    copilot     → .github/copilot-instructions.md
    generic     → prompts/              (copy-paste into any AI tool)

  Examples:
    npx @aktibaba/qa-testing-skills init              Auto-detect platform
    npx @aktibaba/qa-testing-skills init claude       Install for Claude Code
    npx @aktibaba/qa-testing-skills remove claude     Remove Claude Code prompts
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
    'qa-unit': 'Unit Testing — Isolated function/method tests with mocking',
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

function updateClaudeMd() {
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
  let content = '';

  if (fs.existsSync(claudeMdPath)) {
    content = fs.readFileSync(claudeMdPath, 'utf8');
  }

  // Already installed — update it
  if (content.includes(SKILL_MARKER_START)) {
    const regex = new RegExp(
      `${escapeRegex(SKILL_MARKER_START)}[\\s\\S]*?${escapeRegex(SKILL_MARKER_END)}`
    );
    content = content.replace(regex, `${SKILL_MARKER_START}\n${SKILL_REGISTRY}\n${SKILL_MARKER_END}`);
  } else {
    content = content.trimEnd() + '\n\n' + SKILL_MARKER_START + '\n' + SKILL_REGISTRY + '\n' + SKILL_MARKER_END + '\n';
  }

  fs.writeFileSync(claudeMdPath, content);
  console.log('  Updated: CLAUDE.md with skill registry');
}

function removeClaudeMd() {
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) return;

  let content = fs.readFileSync(claudeMdPath, 'utf8');
  if (!content.includes(SKILL_MARKER_START)) return;

  const regex = new RegExp(
    `\\n*${escapeRegex(SKILL_MARKER_START)}[\\s\\S]*?${escapeRegex(SKILL_MARKER_END)}\\n*`
  );
  content = content.replace(regex, '\n');
  fs.writeFileSync(claudeMdPath, content.trimEnd() + '\n');
  console.log('  Cleaned: CLAUDE.md (removed skill registry)');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function copyPrompts(platformKey) {
  const platform = PLATFORMS[platformKey];
  const targetDir = path.join(process.cwd(), platform.dir);

  fs.mkdirSync(targetDir, { recursive: true });

  if (platform.single) {
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

  // Add CLAUDE.md registry for Claude Code
  if (platformKey === 'claude') {
    updateClaudeMd();
  }

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
    console.log('    /qa-unit    → Generate unit tests');
  } else if (platformKey === 'generic') {
    console.log('  Prompt files saved to prompts/ directory.');
    console.log('  Copy-paste any file into your AI tool of choice.');
  } else {
    console.log(`  Prompt files installed to ${platform.dir}/`);
    console.log('  Your AI tool will automatically pick them up.');
  }
  console.log('\n  Done!\n');
}

function remove(platformArg) {
  const platformKey = platformArg || detectPlatform();
  const platform = PLATFORMS[platformKey];

  if (!platform) {
    console.error(`  Unknown platform: ${platformArg}`);
    process.exit(1);
  }

  console.log(`\n  QA Testing Skills — Removing from ${platform.name}\n`);

  if (platform.single) {
    const targetFile = path.join(process.cwd(), platform.dir, 'copilot-instructions.md');
    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
      console.log(`  Removed: ${path.relative(process.cwd(), targetFile)}`);
    }
  } else {
    let count = 0;
    for (const name of PROMPTS) {
      const dest = path.join(process.cwd(), platform.dir, `${name}${platform.ext}`);
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
        count++;
      }
    }
    console.log(`  Removed: ${count} prompt files from ${platform.dir}/`);
  }

  // Clean CLAUDE.md for Claude Code
  if (platformKey === 'claude') {
    removeClaudeMd();
  }

  console.log('\n  Done!\n');
}

// CLI entry point
const [,, command, ...args] = process.argv;

switch (command) {
  case 'init':
    init(args[0]);
    break;
  case 'remove':
  case 'uninstall':
    remove(args[0]);
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
