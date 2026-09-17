const assert = require('node:assert/strict');
const test = require('node:test');

const stagePackageModule = import('../scripts/stage-npm-package.mjs');

test('accepts the public root release package', async () => {
  const { validateReleasePackage } = await stagePackageModule;
  const packageManifest = {
    name: '@polygonlabs/oms-wallet-react-native',
    version: '1.2.3',
  };
  assert.equal(validateReleasePackage(packageManifest), packageManifest);
});

test('rejects a private release package', async () => {
  const { validateReleasePackage } = await stagePackageModule;
  assert.throws(
    () =>
      validateReleasePackage({
        name: '@polygonlabs/oms-wallet-react-native',
        version: '1.2.3',
        private: true,
      }),
    /must not be private/
  );
});

test('finds nested workspace protocol references in packed manifests', async () => {
  const { findWorkspaceReferences } = await stagePackageModule;
  assert.deepEqual(
    findWorkspaceReferences({
      peerDependencies: { sdk: 'workspace:^' },
      publishConfig: { dependencies: { sdk: '^1.2.3' } },
    }),
    ['package.json.peerDependencies.sdk']
  );
});

test('requires GitHub Actions OIDC before staging', async () => {
  const { assertTrustedPublishingEnvironment } = await stagePackageModule;
  assert.throws(() => assertTrustedPublishingEnvironment({}), /CI-only/);
  assert.throws(
    () => assertTrustedPublishingEnvironment({ GITHUB_ACTIONS: 'true' }),
    /OIDC is unavailable/
  );
  assert.doesNotThrow(() =>
    assertTrustedPublishingEnvironment({
      GITHUB_ACTIONS: 'true',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'token',
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.test/oidc',
    })
  );
});
