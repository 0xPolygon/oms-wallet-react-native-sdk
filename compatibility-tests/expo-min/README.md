# Expo Minimum Compatibility Fixture

Build-only fixture for the oldest supported Expo SDK. CI packs the SDK from the
pull request, installs the tarball here, runs `expo prebuild`, and compiles the
Android and iOS apps.

`expo`, `react`, and `react-native` are pinned to exact versions that match
what this Expo SDK expects. The `prebuild` script pins an exact
`expo-template-bare-minimum` release from the same Expo SDK because some
Expo 56 patch releases bundle the SDK 57 template.

Patch updates within the current version lines (Expo SDK 56, React Native
0.85, React 19.2) are fine; Dependabot proposes only those. Changing a version
line raises the supported minimum: do that in a deliberate pull request that
updates everything listed in the `AGENTS.md` Maintenance Matrix.
`yarn check:supported-versions` fails if the pins, peer ranges, README, and
Dependabot rules disagree.

This directory is not a Yarn workspace member. Install and prebuild it from
the repo root:

```sh
yarn expo-min:install
yarn expo-min:prebuild
```

The generated `ios/` and `android/` folders are ignored.
