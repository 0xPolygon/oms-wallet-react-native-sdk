const assert = require('node:assert/strict');
const test = require('node:test');

const snapshotModule = import('../scripts/prepare-npm-snapshot.mjs');

test('accepts safe non-latest snapshot tags', async () => {
  const { validateSnapshotTag } = await snapshotModule;
  for (const tag of ['snapshot', 'canary', 'pre-0.3.0']) {
    assert.doesNotThrow(() => validateSnapshotTag(tag));
  }
});

test('rejects latest, version-like, and malformed snapshot tags', async () => {
  const { validateSnapshotTag } = await snapshotModule;
  for (const tag of [
    'latest',
    '0.3.0',
    'v0.3.0',
    '0.3.0-beta.1',
    'beta tag',
    'Beta',
  ]) {
    assert.throws(() => validateSnapshotTag(tag));
  }
});

test('detects whether a changeset contains a package release', async () => {
  const { changesetHasRelease } = await snapshotModule;
  assert.equal(changesetHasRelease('---\n---\n\nDocumentation only.\n'), false);
  assert.equal(
    changesetHasRelease(
      '---\n"@polygonlabs/oms-wallet-react-native": patch\n---\n\nFix behavior.\n'
    ),
    true
  );
});

test('requires the package to receive the requested snapshot version', async () => {
  const { assertSnapshotVersion } = await snapshotModule;
  const before = {
    name: '@polygonlabs/oms-wallet-react-native',
    version: '0.2.0',
  };
  const after = {
    name: '@polygonlabs/oms-wallet-react-native',
    version: '0.0.0-canary-20260909000000',
  };

  assert.doesNotThrow(() => assertSnapshotVersion(before, after, 'canary'));
  assert.throws(
    () => assertSnapshotVersion(before, before, 'canary'),
    /Snapshot versioning did not change/
  );
});
