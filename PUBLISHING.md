# Publishing

> **Publishing is CI-only. Never publish or stage from a local machine.** Do not run
> `changeset version`, `changeset publish`, `npm publish`, `npm stage publish`,
> `yarn npm publish`, or the internal `ci:stage-release` script yourself. A local release bypasses
> the signed release commit and npm OIDC trusted publishing. Contributors land a changeset; CI
> prepares the release, and an npm maintainer performs the final 2FA approval.

Releases are driven by Changesets. The only publishable package is the repository-root
`@polygonlabs/oms-wallet-react-native`; the example workspaces are private and are never versioned
or tagged. The `.` entry in `package.json#workspaces` intentionally makes the root package visible
to Changesets while keeping the package at the repository root.

## Day-to-day changesets

Every pull request must include a changeset:

```sh
yarn changeset
```

Choose the SemVer bump that matches the React Native package's public impact and write a
user-facing changelog entry. Use an empty changeset when the pull request changes only
documentation, CI, tooling, or examples:

```sh
yarn changeset add --empty
```

Commit the changeset with the rest of the pull request. The Changeset check blocks pull requests
that omit it.

## Automated release flow

1. Merge changes, including their changesets, into `master`.
2. After JavaScript, package, Expo, Android, and iOS verification succeeds, the Release workflow
   opens or updates `chore(release): publish package`.
3. Review and merge that release pull request.
4. The same workflow verifies the release commit, installs npm `11.15.0`, packs the package with
   Yarn, checks the packed manifest, and sends the tarball to `npm stage publish` through OIDC
   trusted publishing. Changesets then creates the package tag and GitHub Release.
5. An npm maintainer inspects and approves the staged package with 2FA. Only approval makes the
   package publicly installable.
6. After approval, manually run the **Post-publish Expo update** workflow with the published version.
   It verifies that npm serves that exact version, then opens the standalone Expo example update.

Version-bump commits are signed by GitHub's GPG key (`commitMode: github-api`) to satisfy branch
protection. The package tag and GitHub Release record that CI staged the exact release artifact;
they do not mean npm approval has finished.

### Approve a staged release

Inspect and approve the stage with npm `11.15.0` or newer:

```sh
npm stage list @polygonlabs/oms-wallet-react-native
npm stage view <stage-id>
npm stage approve <stage-id> # prompts for 2FA
```

If staging succeeds but the workflow fails before its package tag is created, reject that partial
stage with `npm stage reject <stage-id>` before retrying because staging reserves the package
version. Otherwise, rerunning the workflow skips versions that already have a package tag or are
already published.

## Native dependency version policy

The npm wrapper version is independent of the native SDK version:

- `android/build.gradle` and `OmsWalletReactNativeSdk.podspec` normally pin the same native SDK
  version.
- A native SDK bump requires confirming that both Maven Central and CocoaPods artifacts exist,
  running Android and iOS builds, and adding a changeset based on the React Native consumer impact.
- React Native-only changes may release npm without changing either native dependency.
- Release automation never changes native dependency versions.
- Any intentional Swift/Kotlin version divergence requires explicit approval and documentation.

## Local release-readiness checks

Use local dry runs only:

```sh
yarn install --immutable
yarn verify
yarn check:package
yarn expo-example:install
npm --prefix examples/expo-example run typecheck
yarn expo-example:prebuild
yarn expo-example:verify-autolinking
```

Native Android and iOS builds run in CI. Do not publish or stage when any required check is failing.
The staging helper additionally refuses to run outside GitHub Actions with an OIDC token and
checks the Yarn-packed manifest immediately before sending it to npm.

## Snapshot releases

To prepare a throwaway prerelease under a non-`latest` npm dist-tag:

1. Open GitHub Actions → Release → Run workflow.
2. Enter a tag such as `canary` or `pre-0.3.0`.

The workflow versions only the runner state. If there is no versioned changeset, it creates a
temporary patch changeset so snapshot versioning cannot silently produce nothing. It then stages
the snapshot through npm OIDC and skips git tags, GitHub Releases, and Expo follow-up pull requests.
The tag must be lowercase, non-version-shaped, and different from `latest`. An npm maintainer must
approve the stage before consumers can install it with
`yarn add @polygonlabs/oms-wallet-react-native@<tag>`.

## npm owner setup

An npm owner must configure the package before the first staged release:

1. Open the `@polygonlabs/oms-wallet-react-native` package settings on npmjs.com and go to
   **Trusted Publisher**.
2. If the existing GitHub Actions publisher only allows direct `npm publish`, delete it and create a
   replacement. npm does not allow an existing trusted-publisher connection to be edited.
3. Create the GitHub Actions trusted publisher with these exact fields:

   - Organization or user: `0xPolygon`
   - Repository: `oms-wallet-react-native-sdk`
   - Workflow filename: `release.yml` (filename only, not `.github/workflows/release.yml`)
   - Environment name: leave blank
   - Allowed actions: enable `npm stage publish` only; do not enable direct `npm publish`

4. Under **Publishing access**, select **Require two-factor authentication and disallow tokens**.
   Trusted publishing continues to work through OIDC; this setting blocks long-lived automation
   tokens from bypassing the staged flow.
5. Confirm the repository has access to `CHANGESET_RELEASE_BOT_APP_ID` and
   `CHANGESET_RELEASE_BOT_APP_PRIVATE_KEY`. The workflow does not use `NPM_TOKEN`.

The trusted-publisher fields are case-sensitive. A mismatch normally appears only when the workflow
tries to stage the package, so verify the organization, repository, and workflow filename before
merging the first release pull request.

## npm maintainer release checklist

After CI stages a version:

1. Use npm `11.15.0` or newer and sign in to an npm account with write access and 2FA enabled.
2. Inspect the pending stage, including its provenance and tarball:

   ```sh
   npm stage list @polygonlabs/oms-wallet-react-native
   npm stage view <stage-id>
   npm stage download <stage-id>
   ```

3. Approve the stage with `npm stage approve <stage-id>` and complete the 2FA prompt. If the
   artifact is wrong, use `npm stage reject <stage-id>` instead.
4. Verify npm serves the exact version:

   ```sh
   npm view @polygonlabs/oms-wallet-react-native@<version> version dist.integrity
   ```

5. Run GitHub Actions → **Post-publish Expo update** with that exact version. Confirm its pull
   request passes Expo typechecking, clean prebuild, and native autolinking checks.
