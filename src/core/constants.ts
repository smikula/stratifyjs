import type { EnforcementMode, OutputFormat } from '../types/types.js';

/*
 * Default glob patterns for identifying packages within the monorepo.
 * Used by config-defaults as the single source of truth.
 */
export const DEFAULT_PATTERNS: string[] = ['packages/**/*'];

/**
 * Default version-string prefixes that identify internal (monorepo) dependencies.
 * Used by config-defaults and package-parser as the single source of truth.
 */
export const DEFAULT_PROTOCOLS: string[] = ['workspace:'];

/**
 * Default glob patterns to exclude from package discovery.
 * Used by config-defaults as the single source of truth.
 */
export const DEFAULT_IGNORE: string[] = ['**/node_modules/**', '**/lib/**', '**/dist/**'];

/**
 * Default dependency types to check for internal monorepo dependencies.
 * Only production dependencies are checked by default.
 */
export const DEFAULT_DEPENDENCY_TYPES: string[] = ['dependencies'];

/**
 * Valid dependency type values accepted in the workspaces.dependencyTypes config.
 */
export const VALID_DEPENDENCY_TYPES = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
] as const;

/**
 * Default enforcement mode when none is specified in config.
 */
export const DEFAULT_ENFORCEMENT_MODE: EnforcementMode = 'warn';

/**
 * Valid enforcement mode values accepted in config and CLI.
 */
export const VALID_ENFORCEMENT_MODES = [
    'error',
    'warn',
    'off',
] as const satisfies readonly EnforcementMode[];

/**
 * Default config filename looked up relative to the workspace root.
 */
export const DEFAULT_CONFIG_FILENAME = 'stratify.config.json';

/**
 * Wildcard token in allowedDependencies that permits depending on any layer.
 */
export const WILDCARD_LAYER = '*';

/**
 * Default CLI output format.
 */
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'console';
