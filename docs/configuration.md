# Configuration Reference

[Quick Start](../README.md#quick-start) | [CLI](cli.md) | [API](api.md) | [Architecture](../ARCHITECTURE.md) | [Contributing](../CONTRIBUTING.md)

StratifyJS reads `stratify.config.json` from the workspace root by default. The CLI can select another file with `--config`; API callers can use `configPath` or provide a config object directly.

## Config Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `layers` | Yes | Map of layer names to their definitions |
| `enforcement` | No | Enforcement mode; defaults to `warn` |
| `workspaces` | No | Discovery patterns, internal dependency protocols, ignores, and selected dependency fields |
| `dependencyExceptions` | No | Inline exception array; defaults to `[]` |
| `dependencyExceptionsFile` | No | Workspace-root-relative path to an exception array; mutually exclusive with `dependencyExceptions` |

Only `layers` is required. Omitted fields use [core defaults](../src/core/config-defaults.ts) and [constants](../src/core/constants.ts). The following snippets illustrate individual sections to merge into your config; the [full example](#full-configuration-example) combines them.

## Layers

Each layer specifies which target layers its packages may depend on:

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

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `description` | `string` | No | Human-readable description |
| `allowedDependencies` | `string[]` | Yes | Permitted target layer names; `"*"` permits all layers |
| `allowedPackages` | `string[]` | No | Inline membership allowlist; mutually exclusive with `allowedPackagesFile` |
| `allowedPackagesFile` | `string` | No | Workspace-root-relative path to a JSON membership allowlist |

Layer names in `allowedDependencies` are not checked against configured layer names. Unknown names or typos are accepted by schema validation, so review these lists carefully. See `validateLayerDefinition()` in [config-schema.ts](../src/core/config-schema.ts).

### Package Assignment

Each discovered package declares its layer in `package.json`:

```json
{
    "name": "my-package",
    "version": "1.0.0",
    "layer": "core"
}
```

A missing, empty, or non-string layer produces a `missing-layer` violation. Non-string values are diagnosed as invalid and must be replaced with a string; the violation type is retained for compatibility. An unconfigured layer produces an `unknown-layer` violation.

### Same-layer Dependencies

By intentional policy, there is no automatic same-layer exemption. A layer must list itself in `allowedDependencies`, or use `"*"`, for its packages to depend on each other. For example, a dependency from one `core` package to another requires `"core"` or `"*"` in `core.allowedDependencies`; an empty list permits none.

This policy is implemented by `isDependencyAllowed()` in [rules.ts](../src/core/rules.ts).

### Wildcard Dependencies

`"*"` permits all target layers, including the source layer:

```json
{
    "layers": {
        "app": {
            "description": "Application entry points",
            "allowedDependencies": ["*"]
        }
    }
}
```

### Layer Membership Control

Membership allowlists restrict which packages may declare a layer. Layers with neither allowlist field are unrestricted. Use them to limit tech-debt layer growth, constrain entry points to approved app shells, or control membership in privileged layers.

An inline list is useful for a small set of members:

```json
{
    "layers": {
        "entry": {
            "description": "App bootstraps",
            "allowedDependencies": ["features", "core", "shared"],
            "allowedPackages": ["@myapp/web-main", "@myapp/web-admin"]
        }
    }
}
```

Larger lists can live in a separate file:

```json
{
    "layers": {
        "legacy": {
            "description": "Packages not yet migrated",
            "allowedDependencies": ["*"],
            "allowedPackagesFile": "legacy-packages.json"
        }
    }
}
```

`legacy-packages.json` contains a JSON array of strings:

```json
[
    "@myapp/old-auth",
    "@myapp/old-cart",
    "@myapp/old-checkout"
]
```

Keeping this list sorted and checked into source control is usage guidance, not a validation requirement. Specifying both `allowedPackages` and `allowedPackagesFile` is a config validation error. An empty inline array or a file containing `[]` is a valid restrict-all allowlist; a zero-byte file is invalid JSON.

See `validateAllowlistContent()` in [allowlist-file-loader.ts](../src/adapters/allowlist-file-loader.ts) and `isPackageAllowedInLayer()` in [rules.ts](../src/core/rules.ts).

## Enforcement

```json
{
    "enforcement": {
        "mode": "error"
    }
}
```

| Mode | CLI behavior on violations or discovery issues | API behavior |
| --- | --- | --- |
| `error` | Reports findings and exits `1` | Returns violations and discovery issues without throwing |
| `warn` (default) | Reports findings and exits `0` | Returns the same findings as `error` |
| `off` | Suppresses ordinary violations and discovery issues | Returns empty `violations` and `discoveryIssues` arrays |

Main config and configured dependency-exception files are resolved and validated before any `off` early return. Errors from those stages remain fatal in every mode. Invalid mode values are rejected; config validation, API overrides, and CLI parsing share `validateEnforcementMode()` in [config-schema.ts](../src/core/config-schema.ts).

Allowlist files are loaded only when validation proceeds. With an empty resolved exception list, `off` skips package discovery, allowlist-file loading, and package validation. With non-empty exceptions, `off` still runs those stages, validates exceptions, and reports accepted exceptions while suppressing ordinary violations and discovery issues. Allowlist-file errors are fatal whenever those files are loaded.

The ordering is implemented by `validateLayers()` in [api.ts](../src/api/api.ts). See [CLI exit codes](cli.md#exit-codes) and [API mode semantics](api.md#mode-semantics).

## Workspaces

These options control discovery and internal dependency extraction:

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

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `patterns` | `string[]` | `["packages/**/*"]` | Package-directory globs; `/package.json` is appended to each pattern, so do not include the filename |
| `protocols` | `string[]` | `["workspace:"]` | Version-string prefixes identifying internal dependencies |
| `ignore` | `string[]` | `["**/node_modules/**", "**/lib/**", "**/dist/**"]` | Globs excluded from discovery |
| `dependencyTypes` | Non-empty `string[]` | `["dependencies"]` | Selected fields: `dependencies`, `devDependencies`, or `peerDependencies` |

Each supplied array **replaces**, rather than extends, its default. Include every value you still need. Adding `"link:"` requires retaining `"workspace:"` explicitly if both should be checked; a custom ignore list must retain default exclusions if you want them.

See `applyDefaults()` in [config-defaults.ts](../src/core/config-defaults.ts) and `discoverPackages()` in [file-system-discovery.ts](../src/adapters/file-system-discovery.ts).

### Dependency Detection

By default, only `workspace:` entries in `dependencies` are checked. Other configurable prefixes include `link:`, `portal:`, and `file:`; matching uses `version.startsWith(prefix)`, not protocol resolution.

To check build/test dependencies too, include additional fields:

```json
{
    "workspaces": {
        "dependencyTypes": ["dependencies", "devDependencies"]
    }
}
```

| Field | Typical meaning |
| --- | --- |
| `dependencies` | Production/runtime dependencies (default) |
| `devDependencies` | Build tools, test helpers, and linters |
| `peerDependencies` | Peer contracts provided by consumers |

**Usage guidance:** keep `dependencies` selected when enforcing runtime boundaries. External registry-version dependencies are ignored when they do not match a configured prefix.

### Repeated Dependency Names

Each selected field is filtered by protocol independently. A dependency is checked if **any** selected field lists it with a configured protocol, so `dependencyTypes` order does not matter. With `["dependencies", "devDependencies"]`, a runtime entry of `"target": "workspace:*"` is checked even if `devDependencies` lists `"target": "^1.0.0"`, and the reverse also holds. Repeated names produce one edge.

`parsePackageJson()` separately extracts runtime dependencies from `dependencies` for exception eligibility. See `extractInternalDependencies()` in [package-parser.ts](../src/core/package-parser.ts).

### Scan Coverage

Only successfully discovered packages and protocol-matching dependencies in selected fields participate:

- Edges to undiscovered packages or packages without a layer are skipped. A discovered unlayered package still receives its own `missing-layer` violation.
- An unreadable manifest, invalid JSON, or missing/invalid `name` causes the manifest to be omitted from validation and `totalPackages`, with an `invalid-package-json` discovery issue identifying its path and reason.
- Duplicate names produce one `duplicate-package-name` discovery issue per name, listing every declaring manifest. All parsed manifests are counted and validated; dependency target lookup uses the lexicographically smallest workspace-relative manifest path (case-sensitive, not locale-based), independent of glob order.
- Zero valid packages produces a `no-packages-found` discovery issue identifying the workspace root. Check patterns, ignores, and manifests. If all matched manifests are invalid, their individual issues are also included.
- Default ignores exclude `**/node_modules/**`, `**/lib/**`, and `**/dist/**`. A source package under a directory named `lib` is skipped too.

Discovery issues are separate from ordinary violations in the API's `discoveryIssues` array and in CLI reports. They fail CLI runs in `error`, are reported without failing in `warn`, and are suppressed in `off`. Overlapping patterns matching the same manifest do not create duplicates. Fatal glob failures remain errors whenever discovery runs.

These limits follow from [file-system-discovery.ts](../src/adapters/file-system-discovery.ts), [package-parser.ts](../src/core/package-parser.ts), and the package-map/dependency loop in [validation.ts](../src/core/validation.ts). See the [API issue shape](api.md#discovery-issues).

### Violation Types

| Type | Meaning |
| --- | --- |
| `missing-layer` | Missing, empty, or non-string layer |
| `unknown-layer` | Declared layer is not defined in config |
| `invalid-dependency` | Target layer is not permitted and no valid exception accepts the edge |
| `unauthorized-layer-member` | Package is not allowed to declare its layer |

See [API violations](api.md#violations) for returned fields.

## Dependency Exceptions

Exceptions record narrow, owned acknowledgements for real runtime edges that would otherwise violate layer rules. **Usage guidance:** prefer exact package-to-package scopes when that keeps the exception narrower; the schema does not enforce a preference between supported scopes.

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

This assumes both packages are discovered, and checkout has a protocol-matching runtime dependency on legacy-payments whose layer is otherwise forbidden.

For a larger list, put the same JSON array in `config/dependency-exceptions.json`:

```json
{
    "dependencyExceptionsFile": "config/dependency-exceptions.json"
}
```

Inline and file-backed entries have the same validation and semantics. `dependencyExceptions` and `dependencyExceptionsFile` are mutually exclusive, even if the inline array is empty. An empty inline or file-backed array means no exceptions are configured.

A designated capability scope can cover multiple consumers in one layer:

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

This assumes `features` exists, audit-client is discovered, and at least one feature package has an eligible, otherwise-forbidden runtime edge to it.

| Scope | Required fields | Meaning |
| --- | --- | --- |
| Exact edge | `fromPackage`, `toPackage`, `owner`, `reason` | One package may depend on one package |
| Designated capability | `fromLayer`, `toPackage`, `owner`, `reason` | Packages in one layer may depend on one package |

Each entry must use exactly one scope. The schema does not support broad layer-to-layer exceptions. `owner` and `reason` must be non-empty. Source layers and referenced packages must exist. Duplicate, overlapping, stale, unnecessary, and otherwise unused exceptions are configuration errors in every mode, including `warn` and `off`.

### Exception Eligibility

The target must appear both in the source's protocol-matching `dependencies` (runtime dependencies) and in internal dependency names extracted from the selected fields. Dev-only or peer-only edges cannot use exceptions. A runtime edge absent from selected fields makes its exception stale.

The source must have a configured layer and pass membership checks; the target must be discovered and have a layer. Exceptions accept dependency edges, not layer-assignment or membership violations.

If `dependencies` is not selected but the same target appears with a configured protocol in a selected field, such as `devDependencies`, the exception can still apply.

Accepted usage is not hidden: the API returns `acceptedExceptions`, and both console and JSON output report it separately from ordinary violations. Each item contains a resolved exception and its `acceptedEdges`; see [API result types](api.md#accepted-exceptions).

Shape validation is in `validateDependencyExceptions()` in [config-schema.ts](../src/core/config-schema.ts); real-edge matching and unused/stale checks are in `validatePackagesWithExceptions()` in [validation.ts](../src/core/validation.ts). File loading uses [dependency-exceptions-file-loader.ts](../src/adapters/dependency-exceptions-file-loader.ts).

## Full Configuration Example

This config assumes `@example/checkout` declares layer `features` and a runtime `workspace:` dependency on `@example/audit-client`, which declares layer `legacy`. Without that real edge, the exception is stale. The ordinary Quick Start packages can coexist with these packages.

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
        },
        "legacy": {
            "description": "Capabilities awaiting migration",
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
