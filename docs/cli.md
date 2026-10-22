# CLI Reference

[Quick Start](../README.md#quick-start) | [Configuration](configuration.md) | [API](api.md) | [Architecture](../ARCHITECTURE.md) | [Contributing](../CONTRIBUTING.md)

The npm package is `stratifyjs`; its executable is `stratify`. Examples below assume that executable is on your PATH, such as after a global install. For a local install or an explicit package selection, replace `stratify` with `npx --package=stratifyjs stratify`.

```text
stratify [options]
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `-c, --config <path>` | `stratify.config.json` | Config path relative to the workspace root |
| `-r, --root <path>` | `process.cwd()` | Workspace root |
| `-m, --mode <mode>` | Config value, or `warn` | Override with `error`, `warn`, or `off` |
| `--format <type>` | `console` | Output format: `console` or `json` |
| `-V, --version` | | Print version |
| `-h, --help` | | Print help |

Invalid mode/format values produce a stderr diagnostic and exit `1`; they do not silently select another mode or format. Options are registered in [index.ts](../src/cli/index.ts) and validated by `parseCliOptions()` in [options.ts](../src/cli/options.ts).

## Examples

```bash
# Check the current workspace using defaults
stratify

# Explicit config and workspace root
stratify --config stratify.config.json --root .

# Fail CI on ordinary violations
stratify --mode error

# Machine-readable output
stratify --format json

# From a package directory under packages/, select the workspace two levels up
stratify -c stratify.config.json -r ../.. -m error --format console
```

The default mode is `warn` unless config overrides it. `error` fails completed validation when ordinary violations or discovery issues remain; `warn` reports both without failing. `off` suppresses both but does not disable dependency-exception checks. See [enforcement](configuration.md#enforcement) for the exact exception/allowlist loading order.

## Output

### Console

Console output includes progress, discovered package count, violation `detailedMessage` text, and a separate discovery-issue report with issue types, messages, and paths. Discovery issues cover unreadable/invalid manifests, duplicate names (with every declaring path), and zero valid packages. A compliance message is printed only when both findings arrays are empty. Accepted exceptions are listed separately with their dependency edges, owner, and reason. Progress, accepted exceptions, and success messages go to stdout; violations, discovery issues, and fatal diagnostics use stderr, including in `warn` mode. Color handling is CLI-specific.

In `off` mode, no compliance claim is printed. With no resolved exceptions, the CLI reports that validation was skipped and omits the discovered-package count. With exceptions, it reports the discovered count and accepted exceptions, and states that ordinary violations and discovery issues are suppressed.

### JSON

With `--format json`, completed validation writes exactly one JSON document to stdout with `violations`, `discoveryIssues`, `acceptedExceptions`, `totalPackages`, and `duration`. Progress is suppressed and stdout has no terminal color codes. The shape matches the [API result](api.md#result).

Violations or discovery issues in `error` mode still produce the JSON result and exit `1`, without separate stderr diagnostics. Fatal failures instead write a diagnostic to stderr, leave stdout empty, and exit `1`; they do not produce a JSON error document.

Output and exit logic are implemented in `handleValidateCommand()` in [command-handler.ts](../src/cli/command-handler.ts), using [output-helpers.ts](../src/cli/output-helpers.ts).

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Validation completed with no violations or discovery issues, or completed in `warn`/`off` mode |
| `1` | Violations or discovery issues remain in `error` mode, or an invalid option/fatal failure occurred |

Main-config and exception errors remain fatal in every mode. Glob and allowlist-file failures are fatal when those stages run; `off` with no resolved exceptions skips them. Individual unreadable/invalid manifests are omitted from validation but reported as mode-governed discovery issues; see [scan coverage](configuration.md#scan-coverage).

## CI Integration

Select the package explicitly to avoid the unrelated npm package named `stratify`:

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

Package and executable names are defined in [package.json](../package.json). These are example checks for a consuming monorepo, not descriptions of this repository's release workflows; those are covered in [Contributing](../CONTRIBUTING.md#versioning-and-release).
