import { Buffer } from 'node:buffer';

export async function createExpoUpdateCommit({
  github,
  repository,
  baseCommit,
  version,
  packageJson,
  packageLock,
}) {
  const files = [
    {
      path: 'examples/expo-example/package.json',
      contents: packageJson,
    },
    {
      path: 'examples/expo-example/package-lock.json',
      contents: packageLock,
    },
    {
      path: `.changeset/update-expo-example-v${version.replace(/[^a-z0-9]+/gi, '-')}.md`,
      contents: Buffer.from('---\n---\n'),
    },
  ];

  const base = await github(
    `/repos/${repository}/git/commits/${encodeURIComponent(baseCommit)}`
  );
  const treeEntries = [];

  for (const file of files) {
    const blob = await github(`/repos/${repository}/git/blobs`, {
      method: 'POST',
      body: {
        content: file.contents.toString('base64'),
        encoding: 'base64',
      },
    });
    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const tree = await github(`/repos/${repository}/git/trees`, {
    method: 'POST',
    body: {
      base_tree: base.tree.sha,
      tree: treeEntries,
    },
  });

  return github(`/repos/${repository}/git/commits`, {
    method: 'POST',
    body: {
      message: `chore(expo-example): use SDK v${version}`,
      tree: tree.sha,
      parents: [baseCommit],
    },
  });
}
