import type { ValidateLayersOptions } from '../api/api.js';
import { StratifyConfig } from '../api/index.js';

/**
 * Parsed CLI options.
 */
export interface CliOptions {
    config: string;
    root: string;
    mode?: 'error' | 'warn' | 'off';
    format: 'console' | 'json';
}

/**
 * Convert raw commander output into typed CliOptions.
 */
export function parseCliOptions(raw: Record<string, unknown>): CliOptions {
    return {
        config: (raw.config as string) ?? 'stratify.config.json',
        root: (raw.root as string) ?? process.cwd(),
        mode: raw.mode as CliOptions['mode'],
        format: (raw.format as CliOptions['format']) ?? 'console',
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
        ...(resolvedConfig
            ? { config: resolvedConfig }
            : { configPath: cli.config }),
        mode: cli.mode,
    };
}
