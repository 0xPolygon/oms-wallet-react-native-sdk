const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const test = require('node:test');

const expoUpdateModule = import('../scripts/create-expo-update-commit.mjs');

test('creates one commit containing the Expo dependency update and an empty changeset', async () => {
  const { createExpoUpdateCommit } = await expoUpdateModule;
  const calls = [];
  let blobNumber = 0;
  const github = async (path, options = {}) => {
    calls.push({ path, options });

    if (path.endsWith('/git/commits/base-sha')) {
      return { tree: { sha: 'base-tree-sha' } };
    }
    if (path.endsWith('/git/blobs')) {
      blobNumber += 1;
      return { sha: `blob-${blobNumber}` };
    }
    if (path.endsWith('/git/trees')) {
      return { sha: 'tree-sha' };
    }
    if (path.endsWith('/git/commits')) {
      return { sha: 'commit-sha' };
    }

    throw new Error(`Unexpected GitHub API call: ${path}`);
  };

  const commit = await createExpoUpdateCommit({
    github,
    repository: '0xPolygon/oms-wallet-react-native-sdk',
    baseCommit: 'base-sha',
    version: '0.3.1',
    packageJson: Buffer.from('{"dependency":"0.3.1"}\n'),
    packageLock: Buffer.from('{"lockfileVersion":3}\n'),
  });

  assert.equal(commit.sha, 'commit-sha');

  const commitCalls = calls.filter(
    ({ path, options }) =>
      path.endsWith('/git/commits') && options.method === 'POST'
  );
  assert.equal(commitCalls.length, 1);
  assert.deepEqual(commitCalls[0].options.body, {
    message: 'chore(expo-example): use SDK v0.3.1',
    tree: 'tree-sha',
    parents: ['base-sha'],
  });

  const treeCall = calls.find(
    ({ path, options }) =>
      path.endsWith('/git/trees') && options.method === 'POST'
  );
  assert.deepEqual(
    treeCall.options.body.tree.map(({ path }) => path),
    [
      'examples/expo-example/package.json',
      'examples/expo-example/package-lock.json',
      '.changeset/update-expo-example-v0-3-1.md',
    ]
  );

  const blobCalls = calls.filter(({ path }) => path.endsWith('/git/blobs'));
  assert.equal(blobCalls.length, 3);
  assert.equal(
    Buffer.from(blobCalls[2].options.body.content, 'base64').toString('utf8'),
    '---\n---\n'
  );
});
