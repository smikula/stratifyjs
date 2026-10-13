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

Enforce architectural layer boundaries in monorepos. Catches invalid cross-layer dependencies at build time by analyzing internal dependency protocols (e.g. `workspace:`, `link:`, `file:`) in `package.json` files.

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

Same-layer dependencies also need explicit permission. For example, to let `core` packages depend on other `core` packages, use `"allowedDependencies": ["core", "shared"]`. `"*"` permits all target layers, including the source layer; an empty array permits none.

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

With `--format json`, completed validation writes exactly one JSON document to stdout, containing `violations`, `acceptedExceptions`, `totalPackages`, and `duration`. Progress text is suppressed, and stdout contains no terminal color codes. Violations in `error` mode still produce this JSON result, but exit with code `1`. Fatal errors write a diagnostic to stderr, leave stdout empty, and exit with code `1`; they do not produce a JSON result.

Invalid `--mode` or `--format` values are rejected with a diagnostic on stderr and a non-zero exit code.

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
        mode: 'error', // optional override; violations are returned, not thrown
    });

    console.log(`Checked ${result.totalPackages} packages, found ${result.violations.length} violations`);

    for (const v of result.violations) {
        console.log(v.detailedMessage);
    }
    for (const usage of result.acceptedExceptions) {
        console.log(usage.exception.owner, usage.acceptedEdges);
    }
    // The API caller decides whether ordinary violations fail the integration.
    if (result.violations.length > 0) {
        process.exitCode = 1;
    }
} catch (error) {
    if (error instanceof StratifyError) {
        console.error(error.type, error.message);
        process.exitCode = 1;
    } else {
        throw error;
    }
}
```

### Options

| Field           | Type             | Default                  | Description                                    |
| --------------- | ---------------- | ------------------------ | ---------------------------------------------- |
| `workspaceRoot` | `string`         | `process.cwd()`          | Workspace root directory                       |
| `configPath`    | `string`         | `'stratify.config.json'` | Path to config file, relative to workspaceRoot |
| `config`        | `StratifyConfig` | —                        | Pre-built config (skips file loading). `workspaces` and `enforcement` are optional — defaults are applied when omitted. |
| `mode`          | `string`         | From config              | Override: `'error'`, `'warn'`, or `'off'`      |

### Result

| Field                | Type                            | Description                                                   |
| -------------------- | ------------------------------- | ------------------------------------------------------------- |
| `violations`         | `Violation[]`                   | All violations found                                          |
| `acceptedExceptions` | `AcceptedDependencyException[]` | Configured exceptions and the real dependency edges they used |
| `totalPackages`      | `number`                        | Number of discovered packages                                 |
| `duration`           | `number`                        | Elapsed time in milliseconds                                  |

Each `Violation` has a short `message` for programmatic use and a rich `detailedMessage` with actionable context for human-readable output.

The API returns the same ordinary violations in `warn` and `error` modes; neither mode throws just because violations exist. Only the CLI maps `error` plus violations to exit code `1`. API callers must inspect `result.violations` and decide how to fail their own tooling. `off` suppresses ordinary violations; main-config and dependency-exception checks remain active, but discovery and allowlist-file loading may be skipped as described under [`enforcement`](#enforcement-optional).

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
        // enforcement and workspaces are optional — defaults applied automatically
    },
});
```

### Error handling

Main-config failures (missing config, invalid config JSON/schema) and dependency-exception errors throw a `StratifyError` in every enforcement mode. Fatal discovery and allowlist-file errors also throw when validation proceeds; `off` with an empty resolved exception list skips those stages. Invalid `options.mode` overrides from JavaScript callers also throw with type `config-validation-error`; supported values are `error`, `warn`, and `off`. Malformed package manifests are skipped instead, as described under [Scan Coverage](#scan-coverage).

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

The config file (default: `stratify.config.json`) is a JSON object with four sections:

```json
{
  "layers": { ... },
  "dependencyExceptions": [ ... ],
  "enforcement": { ... },
  "workspaces": { ... }
}
```

### `layers` (required)

A map of layer names to their definitions. Each layer must specify which target layers it is allowed to depend on, including its own layer when same-layer dependencies should be permitted.

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
| `allowedPackages`     | `string[]` | No       | Inline list of package names allowed to declare this layer. An empty array prevents every package from declaring it. Mutually exclusive with `allowedPackagesFile`. |
| `allowedPackagesFile` | `string`   | No       | Path to a JSON file (relative to workspace root) containing an array of allowed package names. Mutually exclusive with `allowedPackages`. |

Layer names in `allowedDependencies` are not checked against the configured layer names. An unknown name or typo is accepted by config validation, so review these lists carefully.

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
| `mode` | `"error" \| "warn" \| "off"` | `"warn"` | CLI: `error` = non-zero exit on violations; `warn` = report only; `off` = suppress ordinary violations |

The API returns ordinary violations without throwing in both `error` and `warn` modes. Main config and configured dependency-exception files are resolved and validated before any `off` early return, so errors from those stages remain fatal in every mode.

Allowlist files are loaded only when validation proceeds. When the resolved exception list is empty, `off` skips package discovery, allowlist-file loading, and package validation. With non-empty exceptions, `off` still runs those stages, validates exceptions, and reports accepted exceptions while suppressing ordinary violations. Allowlist-file errors are fatal whenever those files are loaded, including in `off` with non-empty exceptions.

### `workspaces` (optional)

Controls which packages are discovered and how internal dependencies are detected.

```json
{
    "workspaces": {
        "patterns": ["packages/**/*", "shared/**/*"],
        "protocols": ["workspace:", "link:"],
        "ignore": ["**/node_modules/**", "**/lib/**", "**/dist/**", "**/build/**"],
        "dependencyTypes": ["dependencies"]
    }
}
```

Each supplied workspace array **replaces**, rather than extends, its default: `patterns`, `protocols`, `ignore`, and `dependencyTypes`. Include every value you still need. For example, adding `"link:"` requires keeping `"workspace:"` explicitly, and a custom ignore list must retain the default exclusions if you want them.

| Field              | Type       | Default                                                    | Description                                                                                               |
| ------------------ | ---------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `patterns`         | `string[]` | `["packages/**/*"]`                                        | Package-directory glob patterns; `/package.json` is appended to each pattern. Do not include the filename. |
| `protocols`        | `string[]` | `["workspace:"]`                                           | Version-string prefixes that identify internal dependencies. Common values: `"workspace:"`, `"link:"`, `"portal:"`, `"file:"` |
| `ignore`           | `string[]` | `["**/node_modules/**", "**/lib/**", "**/dist/**"]`        | Glob patterns to exclude from package discovery                                                           |
| `dependencyTypes`  | `string[]` | `["dependencies"]`                                         | Which `package.json` dependency fields to check. Valid values: `"dependencies"`, `"devDependencies"`, `"peerDependencies"` |

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

### Same-layer Dependencies

There is no automatic same-layer exemption. A dependency from one `core` package to another is checked against `core.allowedDependencies`, just like a cross-layer dependency. Include `"core"` in that list to permit it, or use `"*"`. With an empty list, even same-layer dependencies are violations.

### Dependency Detection

By default, only `workspace:` protocol dependencies are checked. You can configure additional protocols (e.g. `link:`, `portal:`, `file:`) via the `workspaces.protocols` config field.

By default, only the `dependencies` field is scanned — this represents the true runtime/production boundary between packages. If you also want to enforce layer rules on build-time or test-time dependencies, add `"devDependencies"` and/or `"peerDependencies"` to `workspaces.dependencyTypes`:

```json
{
    "workspaces": {
        "dependencyTypes": ["dependencies", "devDependencies"]
    }
}
```

| Value                | Meaning                                                       |
| -------------------- | ------------------------------------------------------------- |
| `"dependencies"`     | Production/runtime dependencies (default, always recommended) |
| `"devDependencies"`  | Build tools, test helpers, linters                            |
| `"peerDependencies"` | Peer contracts provided by the consumer                       |

External (npm registry) dependencies are ignored — layers only govern internal monorepo boundaries.

When a package lists the same dependency name in multiple selected fields, those fields are merged in `dependencyTypes` order **before** protocol filtering. The last entry wins. For example, with `["dependencies", "devDependencies"]`, a `devDependencies` entry of `"target": "^1.0.0"` hides a `dependencies` entry of `"target": "workspace:*"`, so that dependency is not checked. Reversing the field order makes the workspace entry win.

### Scan Coverage

Only successfully discovered packages and protocol-matching dependencies in the selected fields participate in the scan:

- Edges to undiscovered packages or packages without a layer are skipped. A discovered package without a layer still receives its own `missing-layer` violation.
- A manifest with invalid JSON or a missing/invalid `name` is left out of discovery and `totalPackages`. Discovery warnings are not exposed by the current CLI or API, so omitted packages can make a scan look cleaner than it is.
- Duplicate package names are not rejected. Dependency target lookup uses the last discovered package with that name; do not rely on discovery order.
- The default ignore list excludes `**/node_modules/**`, `**/lib/**`, and `**/dist/**`. Packages under a directory named `lib` are therefore skipped too, even if it contains source rather than build output.

### Violation Types

| Type                 | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `missing-layer`      | Package has no `"layer"` field in its `package.json`                           |
| `unknown-layer`      | Package declares a layer not defined in the config                             |
| `invalid-dependency` | Package depends on another package whose layer is not in `allowedDependencies` |
| `unauthorized-layer-member` | Package declares a layer that has an allowlist, but the package is not in it |

### Layer Membership Control

You can restrict which packages are allowed to belong to a specific layer. This is useful for preventing growth of tech-debt layers, limiting entry points to approved app shells, or requiring approval before packages join privileged layers.

**Inline allowlist** — for layers with a small, stable set of members:

```json
{
    "layers": {
        "entry": {
            "description": "App bootstraps — only approved entry points",
            "allowedDependencies": ["features", "core", "shared"],
            "allowedPackages": ["@myapp/web-main", "@myapp/web-admin"]
        }
    }
}
```

**External JSON file** — for layers with many members (keeps the config readable):

```json
{
    "layers": {
        "legacy": {
            "description": "Existing packages not yet migrated",
            "allowedDependencies": ["*"],
            "allowedPackagesFile": "legacy-packages.json"
        }
    }
}
```

Where `legacy-packages.json` is a sorted JSON array checked into source control:

```json
[
    "@myapp/old-auth",
    "@myapp/old-cart",
    "@myapp/old-checkout"
]
```

The two fields are mutually exclusive — specifying both on the same layer is a config validation error. An empty inline array or empty file is a valid restrict-all allowlist. Layers without either field remain unrestricted.

### Dependency Exceptions

`dependencyExceptions` records narrow, owned acknowledgements for real runtime dependency edges that violate the layer rules. Exact package-to-package exceptions are preferred:

```json
{
    "dependencyExceptions": [
        {
            "fromPackage": "@example/checkout",
            "toPackage": "@example/legacy-payments",
            "owner": "payments-platform",
            "reason": "Temporary bridge while payment authorization is migrated"
        }
    ]
}
```

For large exception lists, put the same JSON array in a separate file and reference it relative to the workspace root:

```json
{
    "dependencyExceptionsFile": "config/dependency-exceptions.json"
}
```

`dependencyExceptions` and `dependencyExceptionsFile` are mutually exclusive. Specifying both, even when the inline array is empty, is a configuration error. An empty inline or file-backed array is valid and means no exceptions are configured.

A layer may consume one designated target capability when multiple packages require the same exception:

```json
{
    "dependencyExceptions": [
        {
            "fromLayer": "features",
            "toPackage": "@example/audit-client",
            "owner": "architecture",
            "reason": "Designated audit capability for feature packages"
        }
    ]
}
```

Each entry must use exactly one supported scope:

| Scope | Required fields | Meaning |
| ----- | --------------- | ------- |
| Exact edge | `fromPackage`, `toPackage`, `owner`, `reason` | Allows one package to depend on one package |
| Designated capability | `fromLayer`, `toPackage`, `owner`, `reason` | Allows packages in one layer to depend on one package |

Broad layer-to-layer exceptions are intentionally unsupported. `owner` and `reason` must be non-empty. Source layers and all referenced packages must exist, and each exception must match at least one discovered runtime dependency that would otherwise violate `allowedDependencies`. Duplicate, overlapping, stale, unnecessary, and otherwise unused exceptions are configuration errors in every mode, including `warn` and `off`. Inline and file-backed entries use the same validation and semantics.

For an exception to apply, the target must appear both in the source package's protocol-matching `dependencies` (runtime dependencies) and in the internal dependency names extracted from the fields selected by `workspaces.dependencyTypes`. Dev-only or peer-only edges cannot use exceptions. A runtime edge absent from the selected fields makes its exception stale. If `dependencies` is not selected but the same target is also present with a configured protocol in a selected field, such as `devDependencies`, the exception can still apply.

The dependency-field shadowing rule above also affects exceptions: a later registry-version entry can remove a runtime target from the selected internal dependency names and make its exception stale.

Successful uses are never hidden: the API returns them in `acceptedExceptions`, and both console and JSON CLI output report them separately from violations. Each accepted item includes the resolved exception and its `acceptedEdges`.

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
    "dependencyExceptions": [
        {
            "fromPackage": "@example/checkout",
            "toPackage": "@example/audit-client",
            "owner": "architecture",
            "reason": "Temporary migration bridge"
        }
    ],
    "enforcement": {
        "mode": "error"
    },
    "workspaces": {
        "patterns": ["packages/**/*", "libs/**/*"],
        "protocols": ["workspace:"],
        "ignore": ["**/node_modules/**", "**/lib/**", "**/dist/**"],
        "dependencyTypes": ["dependencies"]
    }
}
```

## CI Integration

Add to your CI pipeline to enforce boundaries on every PR:

```yaml
# GitHub Actions
- name: Enforce layers
  run: npx --package=stratifyjs stratify --config stratify.config.json --mode error
```

```yaml
# Azure Pipelines
- script: npx --package=stratifyjs stratify --config stratify.config.json --mode error
  displayName: 'Enforce layer boundaries'
```

The npm package is `stratifyjs`; its executable is `stratify`. The explicit `--package` selects the correct package instead of the unrelated npm package named `stratify`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, validation commands, change files, and the versioning/release workflow.

Changes affecting the published package need a Beachball change file unless all changed paths match `ignorePatterns` in [beachball.config.cjs](beachball.config.cjs). Test-only changes under `src/**/__tests__/**` are exempt, along with the other paths listed there; that list is the source of truth for exemptions.

## License

MIT
