#!/bin/bash
set -e

echo "Building all packages..."
pnpm -r build

echo "Running tests..."
pnpm test

echo "Publishing packages in dependency order..."
cd packages/core && pnpm publish --no-git-checks && cd ../..
cd packages/renderer && pnpm publish --no-git-checks && cd ../..
cd packages/brand && pnpm publish --no-git-checks && cd ../..
cd packages/export && pnpm publish --no-git-checks && cd ../..
cd packages/dot-engine && pnpm publish --no-git-checks && cd ../..

echo "Published all packages!"
