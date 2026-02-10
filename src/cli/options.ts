import type { EnforceLayersOptions } from '../api/api.js';

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
 */
export function toLibraryOptions(cli: CliOptions): EnforceLayersOptions {
    return {
        workspaceRoot: cli.root,
        configPath: cli.config,
        mode: cli.mode,
    };
}
