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

The checked-in configuration and workflows define separate versioning and publishing steps:

1. The [version-bump workflow](.github/workflows/version-bump.yml) runs on pushes to `master`, except pushes by `github-actions[bot]`. It installs dependencies and runs `yarn beachball bump` to consume change files and update version/changelog metadata, then commits and pushes if files changed.
2. [beachball.config.cjs](beachball.config.cjs) selects Markdown changelog generation and disables Beachball's own publishing, pushing, and Git tagging. The version-bump workflow performs its Git push separately.
3. The [publish workflow](.github/workflows/publish.yml) runs when a GitHub release is published or when manually dispatched. It installs dependencies, builds, tests, and runs `npm publish`. The package's `prepublishOnly` hook also runs `yarn build` and `yarn test`.

No checked-in workflow creates GitHub releases or tags. Their creation process, npm authorization settings, and whether these workflows have successfully run cannot be confirmed from these files alone.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for source layers, module responsibilities, validation flow, and implementation caveats.
