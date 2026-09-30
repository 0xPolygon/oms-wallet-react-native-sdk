const assert = require('node:assert/strict');
const test = require('node:test');

const supportedVersionsModule =
  import('../scripts/check-supported-versions.mjs');

const dependabot = `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    open-pull-requests-limit: 5

  - package-ecosystem: npm
    directory: /compatibility-tests/expo-min
    ignore:
      - dependency-name: expo
        update-types:
          - version-update:semver-major
          - version-update:semver-minor
      - dependency-name: react
        update-types:
          - version-update:semver-major
          - version-update:semver-minor
      - dependency-name: react-native
        update-types:
          - version-update:semver-major
          - version-update:semver-minor
`;

function consistentInputs() {
  return {
    fixturePackage: {
      scripts: {
        prebuild:
          'expo prebuild --no-install --clean --template expo-template-bare-minimum@56.0.37',
      },
      dependencies: {
        'expo': '56.0.23',
        'react': '19.2.3',
        'react-native': '0.85.3',
      },
    },
    fixtureLock: {
      packages: {
        'node_modules/expo': { version: '56.0.23' },
        'node_modules/react': { version: '19.2.3' },
        'node_modules/react-native': { version: '0.85.3' },
      },
    },
    rootPackage: {
      peerDependencies: { 'react': '>=19.2.0', 'react-native': '>=0.85.0' },
    },
    readme:
      '- React Native 0.85 or newer\n\nInstall in an app on Expo SDK 56 or newer.\n',
    dependabot,
  };
}

test('accepts a consistent supported minimum', async () => {
  const { findVersionProblems } = await supportedVersionsModule;
  assert.deepEqual(findVersionProblems(consistentInputs()), []);
});

test('rejects a peer range that does not match the fixture', async () => {
  const { findVersionProblems } = await supportedVersionsModule;
  const inputs = consistentInputs();
  inputs.rootPackage.peerDependencies['react-native'] = '>=0.84.0';
  assert.deepEqual(findVersionProblems(inputs), [
    'package.json peerDependencies.react-native must be ">=0.85.0" (found ">=0.84.0").',
  ]);
});

test('rejects stale README minimums and a missing Dependabot rule', async () => {
  const { findVersionProblems } = await supportedVersionsModule;
  const inputs = consistentInputs();
  inputs.readme += 'Older text: Expo SDK 55 or newer.\n';
  inputs.dependabot = dependabot.replace('dependency-name: react-native', '');
  const problems = findVersionProblems(inputs);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /Expo SDK 56 or newer.*found 56, 55/);
  assert.match(problems[1], /ignores .* for react-native\.$/);
});

test('rejects a fixture pin that is not exact', async () => {
  const { findVersionProblems } = await supportedVersionsModule;
  const inputs = consistentInputs();
  inputs.fixturePackage.dependencies.expo = '~56.0.23';
  assert.deepEqual(findVersionProblems(inputs), [
    'compatibility-tests/expo-min/package.json must pin expo to exactly 56.0.23 (found ~56.0.23).',
  ]);
});

test('rejects a prebuild template from another Expo SDK', async () => {
  const { findVersionProblems } = await supportedVersionsModule;
  const inputs = consistentInputs();
  inputs.fixturePackage.scripts.prebuild =
    'expo prebuild --template expo-template-bare-minimum@57.0.26';
  const problems = findVersionProblems(inputs);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /expo-template-bare-minimum@56\.x/);
});
