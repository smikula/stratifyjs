# Architecture

This document describes the internal architecture of `stratify`.

## Design Principles

-   **Layered architecture** — the tool itself follows the same layering discipline it enforces.
-   **No thrown exceptions** — all fallible operations return `Result<T, E>` discriminated unions.
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
│ Depends on: Library API                                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Library API Layer                  src/lib/             │
│                                                         │
│ Public programmatic interface. Orchestrates the full    │
│ pipeline: config loading → package discovery →          │
│ validation → report building → formatting.              │
│                                                         │
│ Owns: EnforceLayersOptions, EnforceLayersResult         │
│ Depends on: Core, Adapters                              │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────────┐  ┌─────────────────────────────┐
│ Core Layer             │  │ Adapter Layer               │
│          src/core/     │  │            src/adapters/     │
│                        │  │                             │
│ Pure business logic.   │  │ I/O boundaries. Reads the   │
│ Config validation,     │  │ file system (config files,  │
│ schema checking,       │  │ package.json via glob),     │
│ rule predicates,       │  │ writes to stdout/stderr.    │
│ package parsing,       │  │                             │
│ report building,       │  │ Owns: fs, glob, console     │
│ output formatting.     │  │ Depends on: Core (types,    │
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
│ Foundation of the type system (Package, LayerConfig,    │
│ Violation, etc.)                                        │
└─────────────────────────────────────────────────────────┘
```

## Module Map

### CLI Layer — `src/cli/`

| Module               | Purpose                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | Entry point (`#!/usr/bin/env node`). Parses args with `commander`, reads package version, delegates to `command-handler`. |
| `options.ts`         | Converts raw commander output to typed `CliOptions` and maps them to `EnforceLayersOptions`.                              |
| `command-handler.ts` | Executes the enforce command: calls the library API, formats and prints output, returns an exit code.                     |

### Library API Layer — `src/lib/`

| Module     | Purpose                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `api.ts`   | Core API functions: `enforceLayersAsync()`, `validateConfig()`, `formatResults()`. Wires together adapters and core. |
| `index.ts` | Barrel re-export. The public surface of the package — everything consumers import comes through here.                |

### Core Layer — `src/core/`

| Module                            | Purpose                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `result.ts`                       | `Result<T, E>` discriminated union with `ok()`, `err()`, `isOk()`, `isErr()` constructors.         |
| `errors.ts`                       | `LayerError`, `ConfigError`, `DiscoveryError` type definitions and `formatLayerError()` formatter. |
| `config-schema.ts`                | Runtime validation of raw config objects (`validateConfigSchema()`).                               |
| `config-defaults.ts`              | Default values and `applyDefaults()` for enforcement mode and workspace patterns.                  |
| `rules.ts`                        | Individual rule predicates: `hasRequiredLayer()`, `isKnownLayer()`, `isDependencyAllowed()`.       |
| `validation.ts`                   | Orchestrates all rules across packages (`validatePackages()`).                                     |
| `package-parser.ts`               | Parses `package.json` into typed `Package` objects, extracts `workspace:` dependencies.            |
| `report-builder.ts`               | Groups violations by type and builds a `ValidationReport`.                                         |
| `formatters/console-formatter.ts` | Formats a report as colored terminal output using `picocolors`.                                    |
| `formatters/json-formatter.ts`    | Formats a report as a JSON string.                                                                 |

### Adapter Layer — `src/adapters/`

| Module                     | Purpose                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `config-file-loader.ts`    | Reads `stratify.config.json` from disk, parses JSON, validates via core, applies defaults.                      |
| `file-system-discovery.ts` | Globs for `package.json` files, reads and parses them. Uses `Promise.allSettled` for resilient parallel I/O. |
| `console-output.ts`        | Thin wrappers around `console.log` and `console.error`.                                                      |

### Types — `src/types/`

| Module     | Purpose                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts` | All shared interfaces: `Package`, `LayerDefinition`, `LayerMap`, `EnforcementConfig`, `WorkspaceConfig`, `LayerConfig`, `ResolvedConfig`, `Violation`, `ViolationType`. |

## Data Flow

```
CLI parses args
       │
       ▼
Library API: enforceLayersAsync(options)
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
       ├──► Core: validatePackages(packages, config)
       │         │
       │         ├──► hasRequiredLayer()    → missing-layer
       │         ├──► isKnownLayer()        → unknown-layer
       │         └──► isDependencyAllowed() → invalid-dependency
       │
       └──► Core: buildReport(violations, metadata)
                │
                └──► Result<EnforceLayersResult, LayerError>
                           │
                           ▼
CLI: formatResults() → print → exit code
```

## Error Handling

All operations that can fail return `Result<T, E>` instead of throwing:

```
Result<T, E> = { success: true, value: T } | { success: false, error: E }
```

Error types are organized as tagged unions for exhaustive handling:

-   **`ConfigError`**: `config-not-found`, `config-read-error`, `config-parse-error`, `config-validation-error`
-   **`DiscoveryError`**: `glob-failed`, `package-parse-error`
-   **`LayerError`**: `ConfigError | DiscoveryError` (top-level union)

Non-fatal issues during package discovery (e.g., a single unreadable `package.json`) are collected as `DiscoveryWarning` objects rather than failing the entire run.

## Import Rules

The layers follow a strict dependency direction:

| Layer       | May Import From                             |
| ----------- | ------------------------------------------- |
| CLI         | Library API                                 |
| Library API | Core, Adapters                              |
| Core        | Types                                       |
| Adapters    | Core (types, result, parser, schema), Types |
| Types       | _(nothing)_                                 |

The CLI layer must **not** import directly from `core/` or `adapters/` — it accesses everything through the library API's public surface.

## Key Design Decisions

1. **`Result<T, E>` over exceptions** — makes error paths explicit and composable. Callers must handle both cases.
2. **`workspace:` protocol only** — external npm dependencies are out of scope; layers govern internal monorepo architecture only.
3. **`Promise.allSettled` for discovery** — one broken `package.json` doesn't abort the entire scan; it becomes a warning.
4. **Config file as single source of truth** — layers, enforcement mode, and workspace patterns all live in `stratify.config.json`. No convention-based magic.
5. **Formatters as pure string builders** — formatters return strings rather than writing to stdout, keeping I/O decisions at the edges (CLI or consumer code).
