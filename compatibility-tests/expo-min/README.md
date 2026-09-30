# Expo Minimum Compatibility Fixture

Build-only fixture for the oldest supported Expo SDK. CI packs the SDK from the
pull request, installs the tarball here, runs `expo prebuild`, and compiles the
Android and iOS apps.

`expo`, `react`, and `react-native` are pinned to exact versions that match
what this Expo SDK expects. Dependabot only proposes patch updates for them.
The `prebuild` script pins an `expo-template-bare-minimum` release from the
same Expo SDK because some Expo 56 patch releases bundle the SDK 57 template.
Change these pins only in a deliberate pull request that raises the supported
minimum, and update everything listed in the `AGENTS.md` Maintenance Matrix in
the same pull request. `yarn check:supported-versions` fails if they drift.

This directory is not a Yarn workspace member. Install and prebuild it from
the repo root:

```sh
yarn expo-min:install
yarn expo-min:prebuild
```

The generated `ios/` and `android/` folders are ignored.
