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
