import { resolve } from 'path';
import type { StratifyConfig, Violation } from '../types/types.js';
import { StratifyError } from '../core/errors.js';
import { validatePackages } from '../core/validation.js';
import { loadConfigFromFile } from '../adapters/config-file-loader.js';
import { discoverPackages } from '../adapters/file-system-discovery.js';

/**
 * Options for the validateLayers API.
 */
export interface ValidateLayersOptions {
    /** Workspace root directory. Defaults to process.cwd(). */
    workspaceRoot?: string;
    /** Path to the config file, relative to workspaceRoot. */
    configPath?: string;
    /** Provide a pre-built config directly, skipping file loading. */
    config?: StratifyConfig;
    /** Override the enforcement mode from config. */
    mode?: 'error' | 'warn' | 'off';
}

/**
 * Result of running layer validation.
 */
export interface ValidateLayersResult {
    violations: Violation[];
    totalPackages: number;
    duration: number;
}

/**
 * Validate monorepo packages against architectural layer rules.
 *
 * @param options - Configuration and workspace options.
 * @returns Violations found, total package count, and duration.
 * @throws {StratifyError} On config loading/parsing or package discovery failures.
 *
 * @example
 * ```ts
 * import { validateLayers, StratifyError } from 'stratifyjs';
 *
 * try {
 *   const result = await validateLayers({ workspaceRoot: '.' });
 *   for (const v of result.violations) {
 *     console.log(v.detailedMessage);
 *   }
 * } catch (e) {
 *   if (e instanceof StratifyError) {
 *     console.error(e.message);
 *   }
 * }
 * ```
 */
export async function validateLayers(
    options: ValidateLayersOptions = {}
): Promise<ValidateLayersResult> {
    const startTime = performance.now();

    const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());

    // Resolve config
    let config: StratifyConfig;
    if (options.config) {
        config = options.config;
    } else {
        const configPath = options.configPath ?? 'stratify.config.json';
        const configResult = await loadConfigFromFile(workspaceRoot, configPath);
        if (!configResult.success) {
            throw new StratifyError(configResult.error);
        }
        config = configResult.value;
    }

    // Apply mode override
    if (options.mode) {
        config = {
            ...config,
            enforcement: { ...config.enforcement, mode: options.mode },
        };
    }

    // Discover packages
    const discoveryResult = await discoverPackages(workspaceRoot, config.workspaces);
    if (!discoveryResult.success) {
        throw new StratifyError(discoveryResult.error);
    }

    const { packages } = discoveryResult.value;

    // Validate packages against config
    const violations = validatePackages(packages, config);

    const duration = performance.now() - startTime;

    return { violations, totalPackages: packages.length, duration };
}
