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
 * Error type for all possible stratify error scenarios.
 */
export type StratifyErrorType = LayerError['type'];

/**
 * Public error class thrown by the stratifyjs API on infrastructure failures
 * (config loading, parsing, validation, package discovery).
 *
 * Consumers catch this in a standard try/catch:
 *   try {
 *     const result = await validateLayers();
 *   } catch (e) {
 *     if (e instanceof StratifyError) {
 *       console.error(e.type, e.message);
 *     }
 *   }
 */
export class StratifyError extends Error {
    readonly type: StratifyErrorType;
    readonly details?: string[];
    readonly cause?: unknown;

    constructor(layerError: LayerError) {
        const message = formatLayerError(layerError);
        super(message);
        this.name = 'StratifyError';
        this.type = layerError.type;

        if (layerError.type === 'config-validation-error') {
            this.details = layerError.details;
        }
        if ('cause' in layerError) {
            this.cause = layerError.cause;
        }
    }
}

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
