# Contributing

## Setup

Use Git, Node.js, and Yarn. All checked-in workflows use **Node.js 24.x**. The repository does not pin a Node patch version or a Yarn version: [package.json](package.json) has no `engines` or `packageManager` field, and there is no `.nvmrc`. A minimum supported Node version is not specified.

From the repository root, install dependencies as CI does:

```bash
yarn install --frozen-lockfile
```

## Validation

These scripts are defined in [package.json](package.json):

| Command | Purpose |
| --- | --- |
| `yarn build` | Compile TypeScript to `lib/`, including type checking |
| `yarn test` | Run Jest in ESM mode |
| `yarn typecheck` | Type-check without emitting files |
| `yarn format:check` | Check files covered by the formatter |
| `yarn checkchange` | Run `beachball check --no-check` against the configured base |
| `yarn format` | Apply formatting to files covered by the formatter |

For watch mode, use `yarn dev` (TypeScript) or `yarn test:watch` (Jest). Formatting follows [.prettierignore](.prettierignore), which currently excludes Markdown, `package.json`, `lib/`, and `node_modules/`.

The [CI workflow](.github/workflows/ci.yml) runs install, build, and tests; pull requests also run the change-file check. It does not currently run the standalone type-check or formatting scripts.

## Change Files

Changes affecting the published package need a Beachball change file unless all changed paths are exempt. Run `yarn change`, follow the prompts, and commit the generated JSON file in `change/` with the change.

The `ignorePatterns` list in [beachball.config.cjs](beachball.config.cjs) is the **source of truth for exemptions**, not a blanket "documentation/configuration-only" rule. It includes:

- Every `__tests__` subtree under `src`, through `src/**/__tests__/**`, including `src/__tests__` and layer-local test folders.
- Markdown files, `.github` workflow files, and the specific configuration patterns listed there.

Production source changes outside those patterns still need a change file, even when the same change also edits tests. Beachball compares against `origin/master`; that ref and its history must be available, as in CI's full-history checkout.

## Versioning and Release

Versions are bumped through a manual pull request, not automatically after merge. Change files accumulate in `change/` on `master` until a maintainer opens a bump pull request, and merged changes are not released until that pull request merges and a GitHub Release is published.

1. Contributors add Beachball change files to their pull requests as described in [Change Files](#change-files).
2. A maintainer creates a branch from an up-to-date `master` and runs `yarn beachball bump`. This consumes the pending change files, updates the `version` in [package.json](package.json), and prepends an entry to [CHANGELOG.md](CHANGELOG.md). Review the generated version and changelog, then open a pull request with the result. Run `yarn checkchange` before opening it; if Beachball reports a missing change file, add one of type `none` with `yarn change`. The 4.0.0 bump ([#14](https://github.com/smikula/stratifyjs/pull/14)) included such a file, but whether Beachball requires one for a bump-only change has not been confirmed.
3. After the bump pull request merges, a maintainer creates a GitHub Release and its associated tag (for example, `v4.0.0`) manually through GitHub's web interface, using the new version.
4. Publishing the release triggers the [publish workflow](.github/workflows/publish.yml), which can also be dispatched manually. It installs dependencies, builds, tests, and runs `npm publish`. The package's `prepublishOnly` hook also runs `yarn build` and `yarn test`.

[beachball.config.cjs](beachball.config.cjs) selects Markdown changelog generation and disables Beachball's own publishing, pushing, and Git tagging (`gitTags: false`). No checked-in workflow creates GitHub Releases or tags. The [version-bump workflow](.github/workflows/version-bump.yml) remains in the repository but is disabled on GitHub, so do not rely on it.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for source layers, module responsibilities, validation flow, and implementation caveats.
