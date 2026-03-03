# Architecture

This document describes the internal architecture of `stratify`.

## Design Principles

-   **Layered architecture** — the tool itself follows the same layering discipline it enforces.
-   **No thrown exceptions internally** — core and adapter modules return `Result<T, E>` discriminated unions. The public API throws `StratifyError` at the boundary for idiomatic consumer usage.
-   **Pure core** — business logic has zero I/O; all file system and console interaction is isolated in adapters.
-   **Minimal dependencies** — only three runtime deps: `commander`, `glob`, `picocolors`.

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│ CLI Layer                          src/cli/             │
│                                                         │
│ Thin orchestration shell. Parses arguments with         │
│ commander, delegates to the library API, applies        │
│ colors for progress output, and determines exit codes.  │
│                                                         │
│ Owns: process.argv, process.exit, terminal colors       │
│ Depends on: Library API, Core, Adapters, Types          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Library API Layer                  src/api/             │
│                                                         │
│ Public programmatic interface. Orchestrates the full    │
│ pipeline: config loading → package discovery →          │
│ validation. Throws StratifyError on failures.           │
│                                                         │
│ Owns: ValidateLayersOptions, ValidateLayersResult       │
│ Depends on: Core, Adapters, Types                       │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────────┐  ┌─────────────────────────────┐
│ Core Layer             │  │ Adapter Layer               │
│          src/core/     │  │            src/adapters/     │
│                        │  │                             │
│ Pure business logic.   │  │ I/O boundaries. Reads the   │
│ Config validation,     │  │ file system (config files,  │
│ schema checking,       │  │ package.json via glob).     │
│ rule predicates,       │  │                             │
│ package parsing,       │  │ Owns: fs, glob              │
│ violation building.    │  │ Depends on: Core (types,    │
│                        │  │   result, parser, schema)   │
│ Owns: all rules and    │  │                             │
│   domain types         │  │                             │
│ Depends on: Types only │  │                             │
└────────────────────────┘  └─────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│ Types                              src/types/           │
│                                                         │
│ Shared type definitions. No runtime code, no deps.      │
│ Foundation of the type system (Package, StratifyConfig, │
│ Violation, etc.)                                        │
└─────────────────────────────────────────────────────────┘
```

## Module Map

### CLI Layer — `src/cli/`

| Module               | Purpose                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | Entry point (`#!/usr/bin/env node`). Parses args with `commander`, reads package version, delegates to `command-handler`. |
| `options.ts`         | Converts raw commander output to typed `CliOptions` and maps them to `ValidateLayersOptions`.                             |
| `command-handler.ts` | Executes the enforce command: calls `validateLayers()`, prints output via `detailedMessage`, returns an exit code.        |
| `output-helpers.ts`  | CLI-specific colored terminal output functions (`logInfo`, `logSuccess`, `logError`, `logWarning`, `logGray`, `logPlain`) using `picocolors`. |

### Library API Layer — `src/api/`

| Module     | Purpose                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `api.ts`   | The `validateLayers()` function. Wires together adapters and core. Throws `StratifyError` on failures.        |
| `index.ts` | Barrel re-export. The public surface of the package — everything consumers import comes through here.          |

### Core Layer — `src/core/`

| Module                            | Purpose                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `constants.ts`       | Shared domain constants: `DEFAULT_PATTERNS`, `DEFAULT_PROTOCOLS`, `DEFAULT_IGNORE`, `DEFAULT_CONFIG_FILENAME`, `VALID_ENFORCEMENT_MODES`, `WILDCARD_LAYER`. |
| `result.ts`          | `Result<T, E>` discriminated union with `ok()`, `err()`, `isOk()`, `isErr()` constructors (internal only). |
| `errors.ts`          | `LayerError`, `ConfigError`, `DiscoveryError` type definitions, `formatLayerError()`, and `StratifyError` class. |
| `config-schema.ts`   | Runtime validation of raw config objects (`validateConfigSchema()`).                               |
| `config-defaults.ts` | Default values and `applyDefaults()` for enforcement mode, workspace patterns, protocols, and ignore patterns. |
| `rules.ts`           | Individual rule predicates: `hasRequiredLayer()`, `isKnownLayer()`, `isDependencyAllowed()`, `isPackageAllowedInLayer()`. |
| `validation.ts`      | Orchestrates all rules across packages (`validatePackages()`). Populates `detailedMessage` on violations. |
| `package-parser.ts`  | Parses `package.json` into typed `Package` objects, extracts internal dependencies matching configured protocols. |

### Adapter Layer — `src/adapters/`

| Module                     | Purpose                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `config-file-loader.ts`    | Reads `stratify.config.json` from disk, parses JSON, validates via core, applies defaults.                      |
| `file-system-discovery.ts` | Globs for `package.json` files, reads and parses them. Uses `Promise.allSettled` for resilient parallel I/O. |
| `allowlist-file-loader.ts` | Reads `allowedPackagesFile` JSON files from disk. Validates content is a non-empty string array, returns a `Set<string>`. |

### Types — `src/types/`

| Module     | Purpose                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts` | All shared interfaces: `Package`, `LayerDefinition`, `LayerMap`, `EnforcementConfig`, `WorkspaceConfig`, `StratifyConfig`, `StratifyResolvedConfig`, `Violation`, `ViolationType`. |

## Data Flow

```
CLI parses args
       │
       ▼
Library API: validateLayers(options)        ← throws StratifyError on failure
       │
       ├──► Adapter: loadConfigFromFile()
       │         │
       │         ├──► fs: read stratify.config.json
       │         └──► Core: validateConfigSchema() → applyDefaults()
       │
       ├──► Adapter: discoverPackages()
       │         │
       │         ├──► glob: find all package.json files
       │         ├──► fs: read each file
       │         └──► Core: parsePackageJson()
       │
       ├──► Adapter: loadAllowedPackages()   (for each layer with allowedPackagesFile)
       │         │
       │         └──► fs: read JSON allowlist file → validate → Set<string>
       │
       └──► Core: validatePackages(packages, config, allowedPackagesByLayer)
                │
                ├──► hasRequiredLayer()        → missing-layer              (+ detailedMessage)
                ├──► isKnownLayer()            → unknown-layer              (+ detailedMessage)
                ├──► isPackageAllowedInLayer() → unauthorized-layer-member  (+ detailedMessage)
                └──► isDependencyAllowed()     → invalid-dependency         (+ detailedMessage)
                         │
                         ▼
                ValidateLayersResult { violations, totalPackages, duration }
                         │
                         ▼
CLI: prints violation.detailedMessage → exit code
```

## Error Handling

**Internally**, all operations that can fail return `Result<T, E>` instead of throwing:

```
Result<T, E> = { success: true, value: T } | { success: false, error: E }
```

Error types are organized as tagged unions for exhaustive handling:

-   **`ConfigError`**: `config-not-found`, `config-read-error`, `config-parse-error`, `config-validation-error`
-   **`DiscoveryError`**: `glob-failed`, `package-parse-error`
-   **`LayerError`**: `ConfigError | DiscoveryError` (top-level union)

**At the public API boundary**, `Result` failures are converted to a thrown `StratifyError` class. This gives consumers idiomatic `try/catch` error handling while keeping the internal code purely functional.

```typescript
try {
    const result = await validateLayers();
} catch (e) {
    if (e instanceof StratifyError) {
        console.error(e.type, e.message); // e.g. 'config-not-found', 'Config file not found: ...'
    }
}
```

Non-fatal issues during package discovery (e.g., a single unreadable `package.json`) are collected as `DiscoveryWarning` objects rather than failing the entire run.

## Import Rules

The layers follow a strict dependency direction:

| Layer       | May Import From                                                    |
| ----------- | ------------------------------------------------------------------ |
| CLI         | Library API, Core (errors + constants), Adapters (config loading), Types |
| Library API | Core, Adapters, Types                                              |
| Core        | Types                                                              |
| Adapters    | Core (types, result, parser, schema), Types                        |
| Types       | _(nothing)_                                                        |

The CLI layer imports `StratifyError` from `core/errors.ts` for `instanceof` checks and domain constants from `core/constants.ts` (e.g. `DEFAULT_CONFIG_FILENAME`, `DEFAULT_OUTPUT_FORMAT`). The `options.ts` module also imports the `EnforcementMode` type directly from `types/`.

Additionally, `command-handler.ts` imports `loadConfigFromFile` directly from the adapter layer. This is because the CLI needs to load and merge config before calling the API (config options can originate from the file or from CLI flags). This CLI → Adapters edge is a known architectural tension; if config loading were moved behind the API, the edge could be eliminated and the CLI would depend only on the API, Core, and Types layers.

## Key Design Decisions

1. **`Result<T, E>` internally, `throw` at the boundary** — core and adapter modules use `Result` for explicit, composable error paths. The public API converts failures to `StratifyError` throws so consumers use standard `try/catch`.
2. **Configurable protocol detection** — by default only `workspace:` dependencies are checked; users can opt in to `link:`, `portal:`, `file:`, or any future protocol via `workspaces.protocols`. External npm-registry dependencies remain out of scope; layers govern internal monorepo architecture only.
3. **`Promise.allSettled` for discovery** — one broken `package.json` doesn't abort the entire scan; it becomes a warning.
4. **Config file as single source of truth** — layers, enforcement mode, and workspace patterns all live in `stratify.config.json`. No convention-based magic.
5. **Self-describing violations** — each `Violation` carries a `detailedMessage` with rich, actionable context. No separate formatters needed; consumers loop and print.
6. **Minimal public API surface** — one function (`validateLayers`), one error class (`StratifyError`), and the essential types. Internal plumbing (`Result`, `buildReport`, `validatePackages`, etc.) is not exported.

## Self-Applied Configuration

If stratify were used to enforce its own architecture, the configuration would look like this:

```json
{
    "layers": {
        "cli": {
            "description": "CLI entry point — parses argv, prints output, exit codes",
            "allowedDependencies": ["api", "core", "adapters", "types"]
        },
        "api": {
            "description": "Public programmatic interface (validateLayers)",
            "allowedDependencies": ["core", "adapters", "types"]
        },
        "adapters": {
            "description": "I/O boundaries — filesystem, glob discovery",
            "allowedDependencies": ["core", "types"]
        },
        "core": {
            "description": "Pure business logic — validation, rules, config, constants",
            "allowedDependencies": ["types"]
        },
        "types": {
            "description": "Shared interfaces and type definitions — no runtime code",
            "allowedDependencies": []
        }
    },
    "enforcement": {
        "mode": "error"
    },
    "workspaces": {
        "patterns": ["src/*"]
    }
}
```

Note that `cli` currently requires `allowedDependencies: ["api", "core", "adapters", "types"]` because `command-handler.ts` imports `loadConfigFromFile` directly from the adapter layer. A stricter configuration — `"allowedDependencies": ["api", "core", "types"]` — would surface this as a violation, which could be resolved by moving config-file loading behind the API.
