/**
 * Union of all possible errors in the enforce-layers system.
 */
export type LayerError = ConfigError | DiscoveryError;

/**
 * Errors that can occur during configuration loading and validation.
 */
export type ConfigError =
    | { type: 'config-not-found'; message: string; path: string }
    | { type: 'config-read-error'; message: string; path: string; cause?: unknown }
    | { type: 'config-parse-error'; message: string; path: string; cause?: unknown }
    | { type: 'config-validation-error'; message: string; details?: string[] };

/**
 * Errors that can occur during package discovery.
 */
export type DiscoveryError =
    | { type: 'glob-failed'; message: string; pattern: string; cause?: unknown }
    | { type: 'package-parse-error'; message: string; path: string; cause?: unknown };

/**
 * Format any LayerError into a human-readable string.
 */
export function formatLayerError(error: LayerError): string {
    switch (error.type) {
        case 'config-not-found':
            return `Config file not found: ${error.path}`;
        case 'config-read-error':
            return `Failed to read config file (${error.path}): ${error.message}`;
        case 'config-parse-error':
            return `Invalid JSON in config file (${error.path}): ${error.message}`;
        case 'config-validation-error':
            return error.details
                ? `Config validation failed:\n${error.details.map(d => `  - ${d}`).join('\n')}`
                : `Config validation failed: ${error.message}`;
        case 'glob-failed':
            return `Glob pattern failed (${error.pattern}): ${error.message}`;
        case 'package-parse-error':
            return `Failed to parse package at ${error.path}: ${error.message}`;
        default: {
            const _exhaustive: never = error;
            return `Unknown error: ${(_exhaustive as { message: string }).message}`;
        }
    }
}
