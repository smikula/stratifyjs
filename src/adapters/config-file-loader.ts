import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { StratifyResolvedConfig } from '../types/types.js';
import type { ConfigError } from '../core/errors.js';
import type { Result } from '../core/result.js';
import { ok, err } from '../core/result.js';
import { validateConfigSchema } from '../core/config-schema.js';
import { applyDefaults } from '../core/config-defaults.js';

/**
 * Load a layer config file from disk, validate it, and apply defaults.
 * I/O adapter — reads from the file system.
 */
export async function loadConfigFromFile(
    workspaceRoot: string,
    configPath: string
): Promise<Result<StratifyResolvedConfig, ConfigError>> {
    const fullPath = resolve(workspaceRoot, configPath);

    // Read file content
    let content: string;
    try {
        content = await readFile(fullPath, 'utf-8');
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
            return err({
                type: 'config-not-found',
                message: `Config file not found: ${fullPath}`,
                path: fullPath,
            });
        }
        return err({
            type: 'config-read-error',
            message: error instanceof Error ? error.message : String(error),
            path: fullPath,
            cause: error,
        });
    }

    // Parse JSON
    let rawConfig: unknown;
    try {
        rawConfig = JSON.parse(content);
    } catch (error) {
        return err({
            type: 'config-parse-error',
            message: error instanceof Error ? error.message : String(error),
            path: fullPath,
            cause: error,
        });
    }

    // Validate schema
    const validated = validateConfigSchema(rawConfig);
    if (!validated.success) {
        return validated;
    }

    return ok(applyDefaults(validated.value));
}
