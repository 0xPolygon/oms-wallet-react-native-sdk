# Testing

How testing works in this repo. `AGENTS.md` points here so agents know how to verify changes.

## Current state

The repo has a focused unit test suite for JavaScript bridge behavior. The suite uses Node's
built-in test runner against the generated CommonJS package output, so `yarn test` runs
`yarn prepare` first and then executes `test/*.test.js`.

Native device/simulator verification is still manual unless called out by a specific change.

---

## Manual verification checklist

Run these before merging any change:

```bash
# Lint, typecheck, and unit tests
yarn verify

# TypeScript type-check (Expo example)
yarn expo-example:install
npm --prefix examples/expo-example run typecheck

# Build the library
yarn prepare

# Package exports, native SDK version format, and npm contents
yarn check:exports
yarn check:native-versions
yarn check:package
```

Native builds (Android + iOS) run automatically in CI for pull requests and pushes to `master`. If
you changed the native layer (anything in `android/`, `ios/`, or the `.podspec`), make sure the
Android and iOS CI checks pass before merging; validate locally when you need faster feedback.

### Native Expo builds

The `expo-native` job in `verification.yml` packs the SDK from the pull request, installs the
tarball, runs `expo prebuild`, and compiles a debug app for each of:

| Expo target | App | Platforms |
|---|---|---|
| `min` | `compatibility-tests/expo-min` (oldest supported Expo SDK, exact pins) | Android, iOS simulator |
| `current` | `examples/expo-example` (latest Expo SDK) | Android, iOS simulator |

The four jobs run in parallel on `ubuntu-latest` (Android) and `macos-latest` (iOS). To reproduce
one locally (use `expo-example` in place of `expo-min` for the current target):

```bash
yarn expo-min:install
yarn expo-min:verify-autolinking
yarn expo-min:prebuild --platform android
(cd compatibility-tests/expo-min/android && ./gradlew app:assembleDebug -PreactNativeArchitectures=arm64-v8a)

yarn expo-min:prebuild --platform ios
(cd compatibility-tests/expo-min/ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install)
xcodebuild -workspace compatibility-tests/expo-min/ios/OMSExpoMin.xcworkspace -scheme OMSExpoMin \
  -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

The current example's workspace and scheme are `OMSExpoExample`.

`yarn check:supported-versions` (part of `yarn verify`) checks that the fixture pins, the root
`peerDependencies`, the README minimums, and the fixture's Dependabot rule agree. See
`AGENTS.md` → Supported Versions before changing any of them.

---

## Test setup

- **Unit tests** — JavaScript bridge behavior, pure TypeScript behavior, and release helper logic.
  - Runner: Node's built-in `node:test`.
  - Location: `test/*.test.js`.
  - Command: `yarn test`.
  - Current native bridge tests mock `lib/commonjs/NativeOmsWalletReactNativeSdk.js` after
    `yarn prepare`, then import `lib/commonjs/client.native.js`.

- **Integration tests** — tests that exercise the native bridge on a real device or simulator.
  These require a connected device/emulator and valid OMS credentials. Not expected to run in
  standard CI; run manually before release.

---

## Conventions

- Name unit test files `*.test.js` under `test/` unless the project adopts a TypeScript-aware
  test runner later.
- Every bug fix should include a regression test.
- Every new exported function should have at least one happy-path unit test.
- Keep unit tests free of native-bridge calls — mock `NativeOmsWalletReactNativeSdk` at the module
  boundary.
- Keep release helper validation importable and side-effect free; CI-only staging stays behind each
  script's direct-execution guard.

---

## Execution summary

| Goal                          | Command                                      |
|-------------------------------|----------------------------------------------|
| Lint                          | `yarn lint`                                  |
| Typecheck (library)           | `yarn typecheck`                             |
| Install Expo example deps     | `yarn expo-example:install`                 |
| Typecheck (Expo example)      | `npm --prefix examples/expo-example run typecheck` |
| Install Expo minimum fixture  | `yarn expo-min:install`                      |
| Prebuild Expo minimum fixture | `yarn expo-min:prebuild`                     |
| Validate supported minimum    | `yarn check:supported-versions`              |
| Build library                 | `yarn prepare`                               |
| Run unit tests                | `yarn test`                                  |
| SDK verification              | `yarn verify`                                |
| Validate package exports      | `yarn check:exports`                         |
| Validate native SDK versions  | `yarn check:native-versions`                 |
| Validate npm package contents | `yarn check:package`                         |
