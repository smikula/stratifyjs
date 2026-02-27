import type { ValidateLayersOptions } from '../api/api.js';
import type { StratifyConfig } from '../api/index.js';
import type { EnforcementMode } from '../types/types.js';
import { DEFAULT_CONFIG_FILENAME } from '../core/constants.js';
import { DEFAULT_OUTPUT_FORMAT } from './cli-defaults.js';

/**
 * Parsed CLI options.
 */
export interface CliOptions {
    config: string;
    root: string;
    mode?: EnforcementMode;
    format: 'console' | 'json';
}

/**
 * Convert raw commander output into typed CliOptions.
 */
export function parseCliOptions(raw: Record<string, unknown>): CliOptions {
    return {
        config: (raw.config as string) ?? DEFAULT_CONFIG_FILENAME,
        root: (raw.root as string) ?? process.cwd(),
        mode: raw.mode as CliOptions['mode'],
        format: (raw.format as CliOptions['format']) ?? DEFAULT_OUTPUT_FORMAT,
    };
}

/**
 * Convert CLI options to library options.
 * When a pre-loaded config is provided, it is passed directly to the API
 * (skipping file loading), while still allowing the CLI --mode flag to override.
 */
export function toLibraryOptions(
    cli: CliOptions,
    resolvedConfig?: StratifyConfig
): ValidateLayersOptions {
    return {
        workspaceRoot: cli.root,
        ...(resolvedConfig ? { config: resolvedConfig } : { configPath: cli.config }),
        mode: cli.mode,
    };
}
