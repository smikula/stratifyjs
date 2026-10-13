# Architecture

This document describes the internal architecture of the `stratifyjs` package and its `stratify` CLI.

## Design Principles

-   **Layered architecture** — the tool itself follows the same layering discipline it enforces.
-   **Explicit expected failures** — config validation, package parsing, and file/discovery adapters return `Result<T, E>` discriminated unions. Package validation returns violations, accepted exceptions, and exception errors as data. The public API and CLI option parser convert expected failures to `StratifyError` at their boundaries.
-   **Pure core** — business logic has zero I/O; file system interaction is isolated in adapters and console interaction in the CLI.
-   **Minimal dependencies** — only three runtime deps: `commander`, `glob`, `picocolors`.

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│ CLI Layer                          src/cli/             │
│                                                         │
│ Thin orchestration shell. Parses arguments with         │
│ commander, delegates to the library API, prints          │
│ console/JSON output, and determines exit codes.          │
│                                                         │
│ Owns: process.argv, process.exitCode, terminal colors   │
│ Depends on: Library API, Core, Adapters, Types          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Library API Layer                  src/api/             │
│                                                         │
│ Public programmatic interface. Orchestrates the full    │
│ pipeline: config and exception loading → discovery →    │
│ membership and edge validation. Converts errors to      │
│ StratifyError; returns ordinary violations as data.      │
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
│ exception matching.    │  │ Depends on: Core, Types     │
│                        │  │                             │
│ Owns: rules, errors,   │  │                             │
│   result helpers       │  │                             │
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
| `index.ts`           | Entry point (`#!/usr/bin/env node`). Parses args with `commander`, reads package version, catches option-parser failures, delegates to `command-handler`, and sets `process.exitCode`. |
| `options.ts`         | Validates raw mode/format values, returns typed `CliOptions`, and maps them to `ValidateLayersOptions`. Reuses core `validateEnforcementMode()`. |
| `command-handler.ts` | Loads config to determine the effective exit-code mode, calls `validateLayers()`, reports violations and accepted exceptions in console or JSON format, and returns an exit code. |
| `output-helpers.ts`  | CLI-specific colored terminal output functions (`logInfo`, `logSuccess`, `logError`, `logWarning`, `logGray`, `logPlain`) using `picocolors`. |

### Library API Layer — `src/api/`

| Module     | Purpose                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `api.ts`   | `validateLayers()`: validates mode overrides, resolves config/exceptions, discovers packages, resolves membership allowlists, and runs exception-aware validation. Throws `StratifyError` for expected failures, not ordinary violations. |
| `index.ts` | Barrel re-export. The public surface of the package — everything consumers import comes through here.          |

### Core Layer — `src/core/`

| Module                            | Purpose                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `constants.ts`       | Defaults and valid values for workspace discovery, dependency selection, enforcement modes, config filename, and CLI output formats; also `WILDCARD_LAYER`. |
| `result.ts`          | `Result<T, E>` discriminated union, `ok()`/`err()` constructors, and `isOk()`/`isErr()` type guards (internal only). |
| `errors.ts`          | `LayerError`, `ConfigError`, `DiscoveryError` type definitions, `formatLayerError()`, and `StratifyError` class. |
| `config-schema.ts`   | Runtime config and exception-schema validation (`validateConfigSchema()`, `validateDependencyExceptions()`). `validateEnforcementMode()` is shared by config validation, API overrides, and CLI parsing. |
| `config-defaults.ts` | `applyDefaults()` for enforcement and all workspace fields, including `dependencyTypes`, plus the default empty exception list. Workspace arrays replace defaults rather than extend them. |
| `rules.ts`           | Individual rule predicates: `hasRequiredLayer()`, `isKnownLayer()`, `isDependencyAllowed()`, `isPackageAllowedInLayer()`. |
| `validation.ts`      | `validatePackagesWithExceptions()` returns `violations`, `acceptedExceptions`, and `exceptionErrors`; applies package rules and validates exception usage. `validatePackages()` is a violations-only wrapper. Populates `detailedMessage` on violations. |
| `package-parser.ts`  | Parses `package.json` into `Package` objects. Extracts selected internal `dependencies` and separate production `runtimeDependencies`, filtering by configured protocols. |
| `dependency-exception-label.ts` | Formats exception labels with scope and configuration/file position for diagnostics. |

### Adapter Layer — `src/adapters/`

| Module                     | Purpose                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `config-file-loader.ts`    | Reads `stratify.config.json` from disk, parses JSON, validates via core, applies defaults.                      |
| `file-system-discovery.ts` | Appends `/package.json` to directory patterns, globs with configured ignores, and reads/parses manifests using `Promise.allSettled`. Returns packages and non-fatal warnings. |
| `json-file-loader.ts`      | Shared JSON file reader used by config, allowlist, and exception loaders. Returns read/parse failures as `ConfigError` results. |
| `allowlist-file-loader.ts` | Reads `allowedPackagesFile` JSON files, validates an array of strings, and returns a `Set<string>`. An empty array is valid and prevents all packages from joining that layer. |
| `dependency-exceptions-file-loader.ts` | Reads `dependencyExceptionsFile` JSON and validates the array through core `validateDependencyExceptions()`, including source-layer references and duplicate entries. |

### Types — `src/types/`

| Module     | Purpose                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts` | Shared domain types for packages, layers, config, violations, enforcement/output modes, exception scopes, resolved exceptions, and accepted edges/usages. `StratifyConfig` models mutually exclusive inline/file-backed exceptions. API option/result types live in `api.ts`; adapter/core result types live with their modules. |

## Data Flow

```
CLI: commander → parseCliOptions() validates mode/format
       │
       ├──► loadConfigFromFile() → effective exit-code mode
       │
       ▼
Library API: validateLayers(options)
       │
       ├──► Core: validateEnforcementMode() for options.mode, if supplied
       │
       ├──► Resolve config
       │         │
       │         ├──► File: loadConfigFromFile() → loadJsonFile()
       │         │         → validateConfigSchema() → applyDefaults()
       │         └──► options.config: validateConfigSchema() → applyDefaults()
       │
       ├──► Resolve dependency exceptions
       │         │
       │         ├──► Inline entries: already schema-validated with config
       │         └──► File: loadDependencyExceptions() → loadJsonFile()
       │                   → validateDependencyExceptions()
       │
       ├──► Apply validated options.mode override
       │
       ├──► If mode is off AND resolved exception list is empty:
       │         return { violations: [], acceptedExceptions: [],
       │                  totalPackages: 0, duration }
       │
       ├──► Adapter: discoverPackages()
       │         │
       │         ├──► glob: find manifests using patterns and ignores
       │         ├──► fs: read each file
       │         ├──► Core: parsePackageJson() → Package or parse error
       │         └──► { packages, warnings } (API uses packages only)
       │
       ├──► Resolve membership allowlists
       │         │
       │         ├──► Inline allowedPackages → Set<string>
       │         └──► File: loadAllowedPackages() → loadJsonFile()
       │                   → validateAllowlistContent() → Set<string>
       │
       ├──► Core: validatePackagesWithExceptions(packages, config, allowlists)
       │         │
       │         ├──► Package layer/membership/dependency rules
       │         ├──► Match eligible runtime edges to exceptions
       │         └──► { violations, acceptedExceptions, exceptionErrors }
       │
       ├──► Non-empty exceptionErrors → throw StratifyError
       │         (type: config-validation-error; applies in every mode)
       │
       └──► ValidateLayersResult { violations, acceptedExceptions,
                                  totalPackages, duration }
                 (off suppresses ordinary violations only)
                         │
                         ▼
CLI: console report or JSON result → exit code
```

Schema validation checks exception shapes and duplicate scopes; package validation checks referenced packages, real runtime edges, overlapping matches, and stale/unnecessary/unused exceptions. An edge can be accepted only when its target is both a protocol-matching runtime dependency and a selected internal dependency, and the edge would otherwise violate the layer rules. An accepted exception records its resolved scope and `acceptedEdges`.

`warn` and `error` return the same ordinary violations through the API. The CLI alone fails completed validation when the effective mode is `error` and violations remain. `off` with non-empty exceptions still runs discovery, allowlist resolution, and exception-aware validation, then returns accepted exceptions with an empty violations array. The empty-exception early return skips discovery, allowlist-file loading, and package validation, but occurs **after** config and exception-file resolution.

Console mode reports violations through `detailedMessage` and lists accepted exceptions separately. JSON mode suppresses progress and writes only the result document to stdout, including when ordinary violations cause exit code `1`. Fatal CLI failures emit stderr diagnostics, leave JSON stdout empty, and exit `1`.

## Error Handling

**Core parsers/validators and I/O adapters** represent expected config, file, and discovery failures as `Result<T, E>`:

```
Result<T, E> = { success: true, value: T } | { success: false, error: E }
```

Error types are organized as tagged unions for exhaustive handling:

-   **`ConfigError`**: `config-not-found`, `config-read-error`, `config-parse-error`, `config-validation-error`
-   **`DiscoveryError`**: `glob-failed`, `package-parse-error`
-   **`LayerError`**: `ConfigError | DiscoveryError` (top-level union)

Rule predicates return booleans. `validatePackagesWithExceptions()` returns a `PackageValidationResult` with arrays of ordinary violations, accepted usages, and exception-error strings rather than a `Result`.

**At the public API boundary**, `Result` failures and non-empty exception errors are converted to a thrown `StratifyError`. Ordinary violations remain result data, even in `error` mode. **At the CLI option boundary**, `parseCliOptions()` also throws `StratifyError` for invalid mode/format values; the entry point catches these errors and sets exit code `1`. This describes expected failure paths, not a guarantee that arbitrary runtime exceptions cannot occur.

```typescript
try {
    const result = await validateLayers();
} catch (e) {
    if (e instanceof StratifyError) {
        console.error(e.type, e.message); // e.g. 'config-not-found', 'Config file not found: ...'
    }
}
```

Non-fatal issues during package discovery (e.g., an unreadable or malformed manifest, or a missing package name) are collected as `DiscoveryWarning` objects and the manifest is omitted. The API currently discards these warnings, so neither the public result nor CLI output exposes them. A glob failure instead returns an error result that the API throws.

## Import Rules

The source modules follow these inter-layer import directions; modules also import helpers within their own layer:

| Layer       | May Import From                                                    |
| ----------- | ------------------------------------------------------------------ |
| CLI         | Library API, Core (schema validation, errors, constants), Adapters (config loading), Types |
| Library API | Core, Adapters, Types                                              |
| Core        | Types                                                              |
| Adapters    | Core (errors, result, defaults, parser, schema), Types             |
| Types       | _(nothing)_                                                        |

The CLI imports `StratifyError` from `core/errors.ts` for error construction and `instanceof` checks, and constants from `core/constants.ts`, including `VALID_OUTPUT_FORMATS`. `options.ts` imports `EnforcementMode` and `OutputFormat` from `types/`, `ValidateLayersOptions` from the API, and the runtime `validateEnforcementMode()` helper from `core/config-schema.ts`. That same helper validates config modes and JavaScript API overrides, so all three paths share the supported enforcement modes.

`command-handler.ts` also imports `loadConfigFromFile` directly from adapters to read the configured enforcement mode for CLI exit-code logic. `toLibraryOptions()` forwards the root, config path, and optional mode override, not the already-loaded config. Consequently, the normal CLI path reads the config again inside the API. This documents the current CLI → Adapters edge and duplicate loading; it does not imply that either is an intended long-term design.

## Key Design Decisions

1. **Expected failures as data, `throw` at consumer boundaries** — parsers and loaders use `Result`; package validation returns violations and exception errors separately. The API converts expected failures to `StratifyError`, while ordinary violations remain available for caller-defined enforcement.
2. **Configurable protocol detection** — by default only `workspace:` dependencies are checked; users can opt in to `link:`, `portal:`, `file:`, or any future protocol via `workspaces.protocols`. External npm-registry dependencies remain out of scope; layers govern internal monorepo architecture only.
3. **`Promise.allSettled` for discovery** — one broken `package.json` doesn't abort the entire scan; it is skipped with an adapter-level warning that the API currently discards.
4. **Explicit configuration with defaults** — config comes from a JSON file or an API `options.config` object; an optional mode override takes precedence over the resolved config mode. Omitted fields use core defaults.
5. **Self-describing violations** — each `Violation` carries a `detailedMessage` with rich, actionable context. No separate formatters needed; consumers loop and print.
6. **Minimal public API surface** — `src/api/index.ts` exports `validateLayers`, `StratifyError`, and the types `ValidateLayersOptions`, `ValidateLayersResult`, `AcceptedDependencyException`, `DependencyException`, `EnforcementMode`, `StratifyConfig`, and `Violation`. Core plumbing such as `Result`, `validatePackagesWithExceptions`, and `validateEnforcementMode` is not exported through the package entry point.

## Self-Applied Configuration

The following configuration illustrates the logical import directions above **if each source-layer directory were a workspace package** with a `name`, `layer`, and protocol-matching package dependencies:

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

This is not an executable self-check for the current source layout: `src/cli`, `src/api`, `src/core`, `src/adapters`, and `src/types` do not have their own package manifests, and StratifyJS checks package dependencies, not TypeScript imports. The example records the conceptual layering only. In such a package model, `cli` would need `adapters` in its allowed dependencies to represent the current direct config-loader import; omitting it would flag that modeled dependency.
