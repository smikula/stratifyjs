import type { ValidateLayersOptions } from '../api/api.js';
import type { EnforcementMode, OutputFormat } from '../types/types.js';
import {
    DEFAULT_CONFIG_FILENAME,
    DEFAULT_OUTPUT_FORMAT,
    VALID_OUTPUT_FORMATS,
} from '../core/constants.js';
import { validateEnforcementMode } from '../core/config-schema.js';
import { StratifyError } from '../core/errors.js';

/**
 * Parsed CLI options.
 */
export interface CliOptions {
    config: string;
    root: string;
    mode?: EnforcementMode;
    format: OutputFormat;
}

/**
 * Convert raw commander output into typed CliOptions.
 */
export function parseCliOptions(raw: Record<string, unknown>): CliOptions {
    let mode: EnforcementMode | undefined;
    if (raw.mode !== undefined) {
        const modeResult = validateEnforcementMode(raw.mode);
        if (!modeResult.success) {
            throw new StratifyError(modeResult.error);
        }
        mode = modeResult.value;
    }

    const rawFormat = raw.format === undefined ? DEFAULT_OUTPUT_FORMAT : raw.format;
    const format = VALID_OUTPUT_FORMATS.find(value => value === rawFormat);
    if (format === undefined) {
        throw new StratifyError({
            type: 'config-validation-error',
            message: `Invalid output format: "${String(rawFormat)}". Must be ${VALID_OUTPUT_FORMATS.map(f => `"${f}"`).join(', ')}`,
        });
    }

    return {
        config: (raw.config as string) ?? DEFAULT_CONFIG_FILENAME,
        root: (raw.root as string) ?? process.cwd(),
        mode,
        format,
    };
}

/**
 * Convert CLI options to library options.
 */
export function toLibraryOptions(cli: CliOptions): ValidateLayersOptions {
    return {
        workspaceRoot: cli.root,
        configPath: cli.config,
        mode: cli.mode,
    };
}
