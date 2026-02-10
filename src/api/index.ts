// Main API
export { enforceLayersAsync, validateConfig, formatResults } from './api.js';
export type { EnforceLayersOptions, EnforceLayersResult } from './api.js';

// Core types
export type {
    Package,
    LayerConfig,
    LayerDefinition,
    LayerMap,
    ResolvedConfig,
    EnforcementConfig,
    WorkspaceConfig,
    Violation,
    ViolationType,
} from '../types/types.js';

// Error types
export type { LayerError, ConfigError, DiscoveryError } from '../core/errors.js';
export { formatLayerError } from '../core/errors.js';

// Result type
export type { Result } from '../core/result.js';
export { ok, err, isOk, isErr } from '../core/result.js';

// Report types
export type { ValidationReport } from '../core/report-builder.js';
export { buildReport } from '../core/report-builder.js';

// Advanced: individual components for custom pipelines
export { validatePackages } from '../core/validation.js';
export { validateConfigSchema } from '../core/config-schema.js';
export { applyDefaults } from '../core/config-defaults.js';
export { parsePackageJson, extractWorkspaceDependencies } from '../core/package-parser.js';
export { formatConsole } from '../core/formatters/console-formatter.js';
export { formatJson } from '../core/formatters/json-formatter.js';
