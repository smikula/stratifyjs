# Stratify

Enforce architectural layer boundaries in monorepos. Catches invalid cross-layer dependencies at build time by analyzing `workspace:` protocol imports in `package.json` files.

## Installation

```bash
npm install stratifyjs
# or
yarn add stratifyjs
```

For CLI-only usage you can install globally:

```bash
npm install -g stratifyjs
```

## Quick Start

1. Add a `"layer"` field to each workspace `package.json`:

```json
{
    "name": "my-feature",
    "layer": "features",
    "dependencies": {
        "my-core-lib": "workspace:*"
    }
}
```

2. Create a `stratify.config.json` at your workspace root:

```json
{
    "layers": {
        "features": {
            "description": "Feature packages",
            "allowedDependencies": ["core", "shared"]
        },
        "core": {
            "description": "Core business logic",
            "allowedDependencies": ["shared"]
        },
        "shared": {
            "description": "Shared utilities",
            "allowedDependencies": []
        }
    }
}
```

3. Run:

```bash
stratify --config stratify.config.json
```

## CLI Usage

```
stratify [options]
```

| Option                | Default                | Description                                          |
| --------------------- | ---------------------- | ---------------------------------------------------- |
| `-c, --config <path>` | `stratify.config.json`    | Path to the layer config file (relative to root)     |
| `-r, --root <path>`   | `process.cwd()`        | Workspace root directory                             |
| `-m, --mode <mode>`   | Config value or `warn` | Override enforcement mode: `error`, `warn`, or `off` |
| `--format <type>`     | `console`              | Output format: `console` or `json`                   |
| `-V, --version`       |                        | Print version                                        |
| `-h, --help`          |                        | Print help                                           |

### Examples

```bash
# Basic check with defaults
stratify

# Explicit config and root
stratify --config stratify.config.json --root /path/to/monorepo

# Fail CI on violations
stratify --mode error

# Machine-readable output
stratify --format json

# Combine options
stratify -c stratify.config.json -r ../.. -m error --format console
```

### Exit Codes

| Code | Meaning                                                         |
| ---- | --------------------------------------------------------------- |
| `0`  | No violations, or mode is `warn`/`off`                          |
| `1`  | Violations found and mode is `error`, or a fatal error occurred |

## Programmatic API

The library exposes a single function for custom tooling, editor integrations, or CI pipelines.

### `validateLayers(options?)`

Validate monorepo packages against architectural layer rules.

```typescript
import { validateLayers, StratifyError } from 'stratifyjs';

try {
    const result = await validateLayers({
        workspaceRoot: '/path/to/monorepo',
        configPath: 'stratify.config.json',
        mode: 'error', // optional override
    });

    console.log(`Checked ${result.totalPackages} packages, found ${result.violations.length} violations`);

    for (const v of result.violations) {
        console.log(v.detailedMessage);
    }
} catch (error) {
    if (error instanceof StratifyError) {
        console.error(error.type, error.message);
    }
}
```

### Options

| Field           | Type             | Default                  | Description                                    |
| --------------- | ---------------- | ------------------------ | ---------------------------------------------- |
| `workspaceRoot` | `string`         | `process.cwd()`          | Workspace root directory                       |
| `configPath`    | `string`         | `'stratify.config.json'` | Path to config file, relative to workspaceRoot |
| `config`        | `StratifyConfig` | —                        | Pre-built config (skips file loading)          |
| `mode`          | `string`         | From config              | Override: `'error'`, `'warn'`, or `'off'`      |

### Result

| Field           | Type          | Description                        |
| --------------- | ------------- | ---------------------------------- |
| `violations`    | `Violation[]` | All violations found               |
| `totalPackages` | `number`      | Number of discovered packages      |
| `duration`      | `number`      | Elapsed time in milliseconds       |

Each `Violation` has a short `message` for programmatic use and a rich `detailedMessage` with actionable context for human-readable output.

### Pre-built config

You can pass a config object directly instead of loading from a file:

```typescript
import { validateLayers } from 'stratifyjs';

const result = await validateLayers({
    workspaceRoot: '/path/to/monorepo',
    config: {
        layers: {
            features: { allowedDependencies: ['core'] },
            core: { allowedDependencies: [] },
        },
        enforcement: { mode: 'error' },
        workspaces: { patterns: ['packages/*'] },
    },
});
```

### Error handling

Infrastructure failures (missing config, bad JSON, discovery errors) throw a `StratifyError`:

```typescript
import { validateLayers, StratifyError } from 'stratifyjs';

try {
    const result = await validateLayers();
} catch (error) {
    if (error instanceof StratifyError) {
        // error.type: 'config-not-found' | 'config-parse-error' | 'glob-failed' | ...
        console.error(error.message);
    }
}
```

## Config File Format

The config file (default: `stratify.config.json`) is a JSON object with three sections:

```json
{
  "layers": { ... },
  "enforcement": { ... },
  "workspaces": { ... }
}
```

### `layers` (required)

A map of layer names to their definitions. Each layer must specify which other layers it is allowed to depend on.

```json
{
    "layers": {
        "adapters": {
            "description": "I/O and external integrations",
            "allowedDependencies": ["core", "types"]
        },
        "core": {
            "description": "Pure business logic",
            "allowedDependencies": ["types"]
        },
        "types": {
            "description": "Shared type definitions",
            "allowedDependencies": []
        }
    }
}
```

| Field                 | Type       | Required | Description                                                          |
| --------------------- | ---------- | -------- | -------------------------------------------------------------------- |
| `description`         | `string`   | No       | Human-readable description of the layer's purpose                    |
| `allowedDependencies` | `string[]` | **Yes**  | Layer names this layer may depend on. Use `"*"` to allow all layers. |

### `enforcement` (optional)

Controls how violations are reported.

```json
{
    "enforcement": {
        "mode": "error"
    }
}
```

| Field  | Type                         | Default  | Description                                                               |
| ------ | ---------------------------- | -------- | ------------------------------------------------------------------------- |
| `mode` | `"error" \| "warn" \| "off"` | `"warn"` | `error` = non-zero exit on violations; `warn` = report only; `off` = skip |

### `workspaces` (optional)

Controls which packages are discovered for validation.

```json
{
    "workspaces": {
        "patterns": ["packages/**/*", "shared/**/*"]
    }
}
```

| Field      | Type       | Default             | Description                                                                     |
| ---------- | ---------- | ------------------- | ------------------------------------------------------------------------------- |
| `patterns` | `string[]` | `["packages/**/*"]` | Glob patterns to locate workspace packages (each must contain a `package.json`) |

Ignored paths (hardcoded): `**/node_modules/**`, `**/lib/**`, `**/dist/**`.

## Layer Definition Reference

### Package Assignment

Each workspace package declares its layer via the `"layer"` field in `package.json`:

```json
{
    "name": "my-package",
    "version": "1.0.0",
    "layer": "core"
}
```

Packages missing the `"layer"` field produce a `missing-layer` violation.

### Dependency Detection

Only `workspace:` protocol dependencies are checked, across all three dependency fields:

-   `dependencies`
-   `devDependencies`
-   `peerDependencies`

External (npm registry) dependencies are ignored — layers only govern internal monorepo boundaries.

### Violation Types

| Type                 | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `missing-layer`      | Package has no `"layer"` field in its `package.json`                           |
| `unknown-layer`      | Package declares a layer not defined in the config                             |
| `invalid-dependency` | Package depends on another package whose layer is not in `allowedDependencies` |

### Wildcard Dependencies

Use `"*"` to allow a layer to depend on any other layer:

```json
{
    "layers": {
        "app": {
            "description": "Application entry points — can use anything",
            "allowedDependencies": ["*"]
        }
    }
}
```

### Full Config Example

```json
{
    "layers": {
        "app": {
            "description": "Application entry points",
            "allowedDependencies": ["features", "core", "shared"]
        },
        "features": {
            "description": "Feature modules",
            "allowedDependencies": ["core", "shared"]
        },
        "core": {
            "description": "Core business logic",
            "allowedDependencies": ["shared"]
        },
        "shared": {
            "description": "Shared utilities and types",
            "allowedDependencies": []
        }
    },
    "enforcement": {
        "mode": "error"
    },
    "workspaces": {
        "patterns": ["packages/**/*", "libs/**/*"]
    }
}
```

## CI Integration

Add to your CI pipeline to enforce boundaries on every PR:

```yaml
# GitHub Actions
- name: Enforce layers
  run: npx stratify --config stratify.config.json --mode error
```

```yaml
# Azure Pipelines
- script: npx stratify --config stratify.config.json --mode error
  displayName: 'Enforce layer boundaries'
```

## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Build (compile TypeScript → lib/)
yarn build

# Type-check without emitting
yarn typecheck
```

## License

MIT
