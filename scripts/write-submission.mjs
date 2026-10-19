#!/usr/bin/env node
/**
 * Prepare the awesome-dsh-plugin submission for this repository.
 *
 * The list keeps one YAML file per plugin (`data/plugins/<owner>__<repo>.yml`),
 * so the filename and the `url` field must both name the GitHub repository that
 * hosts this package. This script writes that file under `submission/` and
 * points this package's npm metadata back at the same repository, because the
 * list links an npm package to its entry through `package.json.repository`.
 *
 * Usage:
 *   node scripts/write-submission.mjs <github-owner> [repo-name]
 *
 * Example:
 *   node scripts/write-submission.mjs octocat
 *
 * @see https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_REPO = 'dsh-plugin-quick-invoke';
const CATEGORY = 'ui';

const owner = (process.argv[2] ?? '').trim();
const repo = (process.argv[3] ?? DEFAULT_REPO).trim();

if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) {
  console.error('Usage: node scripts/write-submission.mjs <github-owner> [repo-name]');
  console.error('  <github-owner> is a GitHub username or organization, e.g. octocat');
  process.exit(1);
}
if (!/^[A-Za-z0-9._-]+$/.test(repo)) {
  console.error(`Invalid repository name: ${JSON.stringify(repo)}`);
  process.exit(1);
}

const url = `https://github.com/${owner}/${repo}`;

/** One-line claims about the plugin; keep them verifiable against the code. */
const description = {
  en:
    'Adds an installed-plugin picker beside the composer: drag a plugin name into the prompt at the drop point, open a draggable plugin rail in the right sidebar by double-clicking the entry, and choose which plugins (and remarks) appear in Settings.',
  zh:
    '在输入框旁增加已安装插件选择器：把插件名拖到提示词的落点插入，双击入口在右侧边栏打开可拖动插件栏，并可在设置中选择显示哪些插件、填写备注。',
};

/** Single-quoted YAML scalar; inner single quotes are doubled. */
function yamlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const entry = [
  `url: ${url}`,
  `name: ${owner}/${repo}`,
  `category: ${CATEGORY}`,
  'description:',
  `  en: ${yamlString(description.en)}`,
  `  zh: ${yamlString(description.zh)}`,
  '',
].join('\n');

const dest = path.join(ROOT, 'submission', 'data', 'plugins', `${owner}__${repo}.yml`);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, entry, 'utf8');

// The list links an npm package to its entry through the repository field, so
// write it here rather than keeping a stale placeholder in package.json.
const packagePath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.repository = { type: 'git', url: `git+${url}.git` };
pkg.homepage = url;
pkg.bugs = { url: `${url}/issues` };
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

console.log('Submission entry written:');
console.log(`  ${path.relative(ROOT, dest)}`);
console.log(`  ${url}`);
console.log('');
console.log('Next steps:');
console.log('  1. Create the public GitHub repository and push this folder (see submission/README.md).');
console.log('  2. Add the "dsh-plugin" topic to the repository.');
console.log(`  3. Wait until the repository is at least 1 day old, then fork awesome-dsh-plugin`);
console.log(`     and add data/plugins/${owner}__${repo}.yml with the content above; open the PR.`);
console.log('  4. Optional: npm publish (package.json now points repository/homepage/bugs at the repo).');
