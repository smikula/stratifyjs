# Change Log - stratifyjs

<!-- This log was last generated on Wed, 21 Oct 2026 04:19:18 GMT and should not be manually modified. -->

<!-- Start content -->

## 4.0.1

Wed, 21 Oct 2026 04:19:18 GMT

### Patches

- Accept config, allowlist, exception, and package.json files that start with a UTF-8 byte-order mark instead of failing or silently skipping the package (walterb@microsoft.com)
- Name the actual file kind (config, allowed-packages, or dependency-exceptions) in file not-found, read, and JSON parse errors; show the installed `stratify` command name in CLI help; drop the nonexistent bin/ entry from published files (walterb@microsoft.com)
- Fix JSON CLI output to emit only the validation result on stdout, and reject invalid CLI mode/format values and API mode overrides. Clarify enforcement, scan coverage, and dependency-exception behavior. (walterb@microsoft.com)
- Avoid claiming discovery or layer compliance when enforcement is off, and diagnose non-string package layer values as invalid rather than missing while preserving violation types (walterb@microsoft.com)
- Check internal dependencies listed in any selected dependency field, regardless of dependencyTypes order, so a registry-version entry in another field no longer hides a workspace dependency (walterb@microsoft.com)

## 4.0.0

Tue, 08 Sep 2026 21:10:39 GMT

### Major changes

- Support empty membership allowlists and explicit dependency exceptions with mutually exclusive inline and file-backed configuration (walterb@microsoft.com)

## 3.0.0

We, 05 March 2026 10:00:00 GMT

### Major changes

- **BREAKING:** Layer validation now defaults to checking only `dependencies` instead of all three dependency fields. Projects that relied on `devDependencies` or `peerDependencies` being validated must add `"dependencyTypes": ["dependencies", "devDependencies", "peerDependencies"]` to their `workspaces` config to restore the previous behavior. (wbarrantes@hotmail.com)

### Minor changes

- Added `workspaces.dependencyTypes` config option to control which `package.json` dependency fields are checked during layer validation. Valid values: `"dependencies"`, `"devDependencies"`, `"peerDependencies"`. Defaults to `["dependencies"]`. (wbarrantes@hotmail.com)

## 2.1.0

Tu, 03 March 2026 10:00:00 GMT

### Minor changes

- Configurable dependency protocols & ignore patterns (wbarrantes@hotmail.com)

## 2.0.0

Initial release.
