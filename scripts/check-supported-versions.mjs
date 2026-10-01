import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const fixtureDirectory = 'compatibility-tests/expo-min';
const pinnedPackages = ['expo', 'react-native', 'react'];

export const filesToUpdate = [
  `${fixtureDirectory}/package.json (pins and prebuild template) and package-lock.json`,
  'package.json (peerDependencies)',
  'README.md (Requirements and Expo sections)',
  `.github/dependabot.yml (${fixtureDirectory} ignore rule)`,
  'new-polygon-docs: wallets/sdk/react-native/quickstart.md',
  '0xsequence/kotlin-sdk: compatibility-tests Expo fixture',
];

function majorMinor(version) {
  const match = /^(\d+)\.(\d+)\.\d+/.exec(version);
  if (!match) throw new Error(`Cannot parse version ${version}`);
  return { major: match[1], minor: `${match[1]}.${match[2]}` };
}

function dependabotEntry(dependabot, directory) {
  return dependabot
    .split(/^ {2}- package-ecosystem:/m)
    .find((entry) =>
      new RegExp(`^\\s*directory:\\s*${directory}\\s*$`, 'm').test(entry)
    );
}

function hasIgnoreRule(entry, dependency) {
  const rules = entry.split(/^\s*- dependency-name:/m).slice(1);
  return rules.some((rule) => {
    const name = rule
      .split('\n')[0]
      .trim()
      .replace(/^['"]|['"]$/g, '');
    return (
      name === dependency &&
      rule.includes('version-update:semver-major') &&
      rule.includes('version-update:semver-minor')
    );
  });
}

export function findVersionProblems({
  fixturePackage,
  fixtureLock,
  rootPackage,
  readme,
  dependabot,
}) {
  const problems = [];
  const versions = {};

  for (const name of pinnedPackages) {
    const locked = fixtureLock.packages?.[`node_modules/${name}`]?.version;
    const pinned = fixturePackage.dependencies?.[name];
    if (!locked) {
      problems.push(`${fixtureDirectory}/package-lock.json has no ${name}.`);
      continue;
    }
    if (pinned !== locked) {
      problems.push(
        `${fixtureDirectory}/package.json must pin ${name} to exactly ${locked} (found ${pinned}).`
      );
    }
    versions[name] = majorMinor(locked);
  }
  if (problems.length > 0) return problems;

  // Some Expo 56 patch releases bundle the SDK 57 prebuild template, so the
  // fixture passes an explicit template that must match its Expo SDK.
  const template = /expo-template-bare-minimum@(\d+)\.\d+\.\d+(?![\w.-])/.exec(
    fixturePackage.scripts?.prebuild ?? ''
  );
  if (template?.[1] !== versions.expo.major) {
    problems.push(
      `${fixtureDirectory}/package.json scripts.prebuild must pin an exact expo-template-bare-minimum@${versions.expo.major}.<minor>.<patch> template.`
    );
  }

  for (const name of ['react-native', 'react']) {
    const expected = `>=${versions[name].minor}.0`;
    const actual = rootPackage.peerDependencies?.[name];
    if (actual !== expected) {
      problems.push(
        `package.json peerDependencies.${name} must be "${expected}" (found "${actual}").`
      );
    }
  }

  for (const [label, pattern, expected] of [
    ['Expo SDK', /Expo SDK (\d+) or newer/g, versions.expo.major],
    [
      'React Native',
      /React Native (\d+\.\d+) or newer/g,
      versions['react-native'].minor,
    ],
    ['React', /\bReact (\d+\.\d+) or newer/g, versions.react.minor],
  ]) {
    const found = [...readme.matchAll(pattern)].map((match) => match[1]);
    if (found.length === 0 || found.some((version) => version !== expected)) {
      problems.push(
        `README.md must state "${label} ${expected} or newer" (found ${
          found.length === 0 ? 'none' : found.join(', ')
        }).`
      );
    }
  }

  const entry = dependabotEntry(dependabot, `/${fixtureDirectory}`);
  const missing = entry
    ? pinnedPackages.filter((name) => !hasIgnoreRule(entry, name))
    : pinnedPackages;
  if (missing.length > 0) {
    problems.push(
      `.github/dependabot.yml must have an npm entry for /${fixtureDirectory} that ignores semver-major and semver-minor updates for ${missing.join(', ')}.`
    );
  }

  return problems;
}

async function main() {
  const read = (file) =>
    readFile(path.join(repositoryRoot, file), 'utf8').catch((error) => {
      throw new Error(`Cannot read ${file}: ${error.message}`);
    });
  const [fixturePackage, fixtureLock, rootPackage, readme, dependabot] =
    await Promise.all([
      read(`${fixtureDirectory}/package.json`).then(JSON.parse),
      read(`${fixtureDirectory}/package-lock.json`).then(JSON.parse),
      read('package.json').then(JSON.parse),
      read('README.md'),
      read('.github/dependabot.yml'),
    ]);

  const problems = findVersionProblems({
    fixturePackage,
    fixtureLock,
    rootPackage,
    readme,
    dependabot,
  });
  if (problems.length > 0) {
    console.error(
      [
        'Supported minimum versions are inconsistent:',
        ...problems.map((problem) => `  - ${problem}`),
        '',
        'The supported minimum is set by the Expo fixture. Update together:',
        ...filesToUpdate.map((file) => `  - ${file}`),
      ].join('\n')
    );
    process.exitCode = 1;
    return;
  }

  const locked = (name) => fixtureLock.packages[`node_modules/${name}`].version;
  console.log(
    `Supported minimum is consistent (Expo ${locked('expo')}, React Native ${locked('react-native')}, React ${locked('react')}).`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
