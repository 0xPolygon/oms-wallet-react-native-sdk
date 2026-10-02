#!/usr/bin/env bash
set -euo pipefail

# Usage: install-expo-example-dependencies.sh [--published] [app-dir]
# app-dir is relative to the repo root and defaults to examples/expo-example.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PUBLISHED=false
if [[ "${1:-}" == "--published" ]]; then
  PUBLISHED=true
  shift
fi
EXPO_DIR="$ROOT_DIR/${1:-examples/expo-example}"
if [[ ! -f "$EXPO_DIR/package.json" ]]; then
  echo "No package.json in $EXPO_DIR" >&2
  exit 1
fi

PACKAGE_NAME="$(cd "$ROOT_DIR" && node -p "require('./package.json').name")"
PACKAGE_VERSION="$(cd "$ROOT_DIR" && node -p "require('./package.json').version")"
PACKAGE_SPEC="$PACKAGE_NAME@$PACKAGE_VERSION"

if [[ "$PUBLISHED" == true ]]; then
  npm --prefix "$EXPO_DIR" install --package-lock-only --ignore-scripts "$PACKAGE_SPEC"
  npm --prefix "$EXPO_DIR" ci
  exit 0
fi

TMP_DIR="$(mktemp -d)"
restore_manifest() {
  cp "$TMP_DIR/package.json" "$EXPO_DIR/package.json"
  cp "$TMP_DIR/package-lock.json" "$EXPO_DIR/package-lock.json"
  rm -rf "$TMP_DIR"
}
trap restore_manifest EXIT

cp "$EXPO_DIR/package.json" "$TMP_DIR/package.json"
cp "$EXPO_DIR/package-lock.json" "$TMP_DIR/package-lock.json"

TARBALL="$TMP_DIR/oms-wallet-react-native-$PACKAGE_VERSION.tgz"

cd "$ROOT_DIR"
yarn prepare
yarn pack --out "$TARBALL"
npm --prefix "$EXPO_DIR" install --package-lock-only --ignore-scripts "$TARBALL"
npm --prefix "$EXPO_DIR" ci
