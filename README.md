<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/smikula/stratifyjs/master/assets/stratifyjs-logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/smikula/stratifyjs/master/assets/stratifyjs-logo.svg" />
    <!-- PNG fallback for renderers that don't support <picture> (e.g. npmjs.com) -->
    <img src="https://raw.githubusercontent.com/smikula/stratifyjs/master/assets/stratifyjs-logo.png" alt="Stratify logo" width="300" />
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/stratifyjs"><img src="https://img.shields.io/npm/v/stratifyjs" alt="npm version" /></a>
  <a href="https://github.com/smikula/stratifyjs/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/stratifyjs" alt="license" /></a>
  <a href="https://www.npmjs.com/package/stratifyjs"><img src="https://img.shields.io/npm/dm/stratifyjs" alt="downloads" /></a>
</p>

# Stratify

Enforce architectural layer boundaries in monorepos by checking package-to-package dependencies declared in `package.json`. Assign packages to layers, define permitted target layers, and run the CLI or API in your tooling or CI. By default, StratifyJS checks `workspace:` dependencies; it does not scan source imports.

## Installation

Node.js is required. This repository's CI uses Node.js **24.x**; a minimum supported version and exact Node/Yarn versions are not pinned. See [contributor setup](CONTRIBUTING.md#setup) for the source-backed environment details.

```bash
npm install stratifyjs
# or
yarn add stratifyjs
```

For CLI-only usage, you can install globally with `npm install -g stratifyjs`. The npm package is `stratifyjs`, but its executable is `stratify`.

## Quick Start

StratifyJS reads package manifests; you do not need to install these example packages' dependencies to check them.

1. Create two packages under `packages/`, each with a `"layer"` field:

`packages/feature/package.json`:

```json
{
    "name": "@example/feature",
    "version": "1.0.0",
    "layer": "features",
    "dependencies": {
        "@example/core": "workspace:*"
    }
}
```

`packages/core/package.json`:

```json
{
    "name": "@example/core",
    "version": "1.0.0",
    "layer": "core"
}
```

2. Create `stratify.config.json` at the workspace root:

```json
{
    "layers": {
        "features": {
            "allowedDependencies": ["core"]
        },
        "core": {
            "allowedDependencies": []
        }
    },
    "enforcement": {
        "mode": "error"
    }
}
```

This permits `features` to depend on `core`. By intentional policy, same-layer dependencies need [explicit permission](docs/configuration.md#same-layer-dependencies): a layer must list itself in `allowedDependencies`, or use `"*"`, for its packages to depend on each other. An empty list permits none.

3. Run from the workspace root:

```bash
npx --package=stratifyjs stratify --config stratify.config.json
```

For this two-package example, expect two discovered packages, no violations, and exit code `0`. Default discovery looks under `packages/`; customize it using the [configuration reference](docs/configuration.md).

## CLI and API

For machine-readable CLI output:

```bash
npx --package=stratifyjs stratify --mode error --format json
```

Completed validation writes one JSON result to stdout. Ordinary violations in `error` mode exit `1`; fatal errors instead use stderr with empty stdout. See the [CLI reference](docs/cli.md) for all options, output contracts, exit codes, and CI examples.

From an ES module or TypeScript integration:

```typescript
import { validateLayers } from 'stratifyjs';

const result = await validateLayers({ workspaceRoot: '.' });
console.log(result.violations);
```

The API returns ordinary violations in both `warn` and `error` modes; callers decide whether to fail. See the [API reference](docs/api.md) for options, public types, accepted exceptions, mode semantics, and errors.

## Documentation

These reference pages are maintained in the repository; `docs/` is not included in the installed npm package.

| Guide | Contents |
| --- | --- |
| [Configuration](docs/configuration.md) | Layers, defaults, discovery/scan limits, dependency fields and protocols, allowlists, and exceptions |
| [CLI](docs/cli.md) | Options, output, exit codes, and CI integration |
| [API](docs/api.md) | Library examples, options, result types, modes, and errors |
| [Architecture](ARCHITECTURE.md) | Source modules, validation flow, and implementation caveats |
| [Contributing](CONTRIBUTING.md) | Setup, validation commands, change files, and releases |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes need a Beachball change file unless all changed paths match the exemptions in [beachball.config.cjs](beachball.config.cjs), including test-only changes under `src/**/__tests__/**`; that config is the source of truth.

## License

[MIT](LICENSE)
