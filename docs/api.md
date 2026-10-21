# API Reference

[Quick Start](../README.md#quick-start) | [Configuration](configuration.md) | [CLI](cli.md) | [Architecture](../ARCHITECTURE.md) | [Contributing](../CONTRIBUTING.md)

The library exposes `validateLayers(options?)` for custom tooling, editor integrations, and CI pipelines. It returns a `Promise<ValidateLayersResult>`.

## Example

Run this from a workspace containing `stratify.config.json`, such as the Quick Start workspace:

```typescript
import { validateLayers, StratifyError } from 'stratifyjs';

try {
    const result = await validateLayers({
        workspaceRoot: '.',
        configPath: 'stratify.config.json',
        mode: 'error', // optional override; violations are returned, not thrown
    });

    console.log(`Checked ${result.totalPackages} packages, found ${result.violations.length} violations`);

    for (const v of result.violations) {
        console.log(v.detailedMessage);
    }
    for (const issue of result.discoveryIssues) {
        console.log(issue.type, issue.message, issue.paths);
    }
    for (const usage of result.acceptedExceptions) {
        console.log(usage.exception.owner, usage.acceptedEdges);
    }
    // The caller decides whether violations or discovery issues fail the integration.
    if (result.violations.length > 0 || result.discoveryIssues.length > 0) {
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

## Options

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `workspaceRoot` | `string` | `process.cwd()` | Workspace root |
| `configPath` | `string` | `'stratify.config.json'` | Config path relative to `workspaceRoot` |
| `config` | `StratifyConfig` | Not supplied | Pre-built config instead of config-file loading; omitted workspace/enforcement fields receive defaults |
| `mode` | `EnforcementMode` | From resolved config | Override: `error`, `warn`, or `off` |

Options and orchestration are defined in [api.ts](../src/api/api.ts). A supplied `config` skips the main config file, but referenced exception/allowlist files are still resolved from `workspaceRoot` when their stages run.

## Pre-built Config

Only `layers` is required; defaults apply to omitted fields:

```typescript
import { validateLayers } from 'stratifyjs';

const result = await validateLayers({
    workspaceRoot: '.',
    config: {
        layers: {
            features: { allowedDependencies: ['core'] },
            core: { allowedDependencies: [] },
        },
    },
});

console.log(result.violations);
```

See [configuration fields](configuration.md#config-fields) for the complete schema and [workspace defaults](configuration.md#workspaces) for array replacement behavior.

## Result

| Field | Type | Meaning |
| --- | --- | --- |
| `violations` | `Violation[]` | Remaining ordinary violations; empty in `off` |
| `discoveryIssues` | `DiscoveryIssue[]` | Manifest, duplicate-name, and empty-scan issues; empty in `off` |
| `acceptedExceptions` | `AcceptedDependencyException[]` | Configured exceptions and the real edges they accepted |
| `totalPackages` | `number` | Successfully parsed manifest count, including duplicates but excluding invalid manifests; `0` for the empty-exception `off` early return |
| `duration` | `number` | Elapsed milliseconds |

### Violations

A `Violation` contains `type`, `package`, a short `message`, and a rich `detailedMessage` for human-readable output. Its optional `details` carries applicable layer, target-package, allowed-layer, or membership-source context.

The current types are `missing-layer`, `unknown-layer`, `invalid-dependency`, and `unauthorized-layer-member`; see [violation meanings](configuration.md#violation-types). Definitions are in [types.ts](../src/types/types.ts).

### Discovery Issues

`DiscoveryIssue` is a separate discriminated union, not a new `ViolationType`. Every issue has a `type`, actionable `message`, and `paths` array of absolute paths:

| `type` | Context |
| --- | --- |
| `invalid-package-json` | One manifest path; the file could not be read, contained invalid JSON, or failed package parsing (for example, missing/invalid `name`) |
| `duplicate-package-name` | `packageName` and every manifest path declaring it, sorted lexicographically |
| `no-packages-found` | Workspace root path; no valid packages were found, including when all matched manifests were invalid |

All successfully parsed manifests are validated individually. For duplicate names, dependency target lookup uses the manifest with the lexicographically smallest workspace-relative path (case-sensitive, not locale-based), independent of glob order. Fix duplicate names rather than relying on that fallback. Invalid manifests are skipped, but their issues are retained. If all manifests are invalid, both the individual issues and `no-packages-found` are returned.

### Accepted Exceptions

Each accepted item has:

- `exception`: the resolved package or layer scope (`scope: 'package'` or `'layer'`), zero-based `configurationIndex`, source selector, target package, owner, and reason.
- `acceptedEdges`: real edges with `fromPackage`, `fromLayer`, `toPackage`, and `toLayer`.

This preserves exception usage separately from ordinary violations. Eligibility and invalid/stale exception conditions are documented under [dependency exceptions](configuration.md#dependency-exceptions); the resolved and accepted types live in [types.ts](../src/types/types.ts).

## Mode Semantics

`warn` and `error` return the same ordinary violations and discovery issues. Neither mode throws just because either array is non-empty; API callers decide whether to fail their integration. The [CLI](cli.md#exit-codes) converts either kind of finding in `error` mode to exit code `1`.

`off` suppresses ordinary violations and discovery issues, not main-config or dependency-exception errors. Exception files are resolved before the possible early return. With no resolved exceptions, discovery, allowlist-file loading, and package validation are skipped. With non-empty exceptions, those stages still run, exception failures remain fatal, and accepted usages are returned with empty `violations` and `discoveryIssues` arrays.

Invalid JavaScript `options.mode` overrides throw `StratifyError` with type `config-validation-error`; undefined means no override. The runtime helper `validateEnforcementMode()` in [config-schema.ts](../src/core/config-schema.ts) is shared with config and CLI validation. See [enforcement loading order](configuration.md#enforcement) for the canonical mode reference.

## Errors

Expected main-config failures and dependency-exception errors throw `StratifyError` in every mode. Fatal discovery and allowlist-file errors also throw when validation proceeds; an empty-exception `off` run skips those stages.

| Error type | Typical cause |
| --- | --- |
| `config-not-found` | Missing main config or a referenced file that is loaded |
| `config-read-error` | Failure reading a loaded config/allowlist/exception file |
| `config-parse-error` | Invalid JSON in a loaded config/allowlist/exception file |
| `config-validation-error` | Invalid config/schema, runtime mode override, allowlist content, or exception definition/usage |
| `glob-failed` | Fatal package-discovery glob failure |

The broader error union also includes `package-parse-error`, but discovery converts individual unreadable/invalid manifests into adapter warnings and skips them. The API exposes these as `invalid-package-json` discovery issues, governed by enforcement mode rather than thrown. See [scan coverage](configuration.md#scan-coverage).

`StratifyError` exposes `type` and `message`, optional validation `details`, and an optional underlying `cause` for errors that retain one. The [main example](#example) demonstrates `instanceof` handling and rethrows unexpected errors. Definitions and message formatting are in [errors.ts](../src/core/errors.ts).

## Public Exports

[api/index.ts](../src/api/index.ts) exports the `validateLayers` function, `StratifyError`, and these types:

| Type | Purpose |
| --- | --- |
| `ValidateLayersOptions` | API input |
| `ValidateLayersResult` | API output |
| `StratifyConfig` | User-supplied config, including mutually exclusive exception sources |
| `EnforcementMode` | `error`, `warn`, or `off` |
| `Violation` | An ordinary violation |
| `DiscoveryIssue` | A manifest, duplicate-name, or empty-scan issue |
| `DependencyException` | A configured package or layer exception |
| `AcceptedDependencyException` | Resolved exception usage and accepted edges |

Core helpers and other internal types are not exported through the package entry point. See [Architecture](../ARCHITECTURE.md) for their responsibilities.
