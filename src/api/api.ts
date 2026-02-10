import { resolve } from 'path';
import type { ResolvedConfig, Violation, Package, EnforcementConfig } from '../types/types.js';
import type { LayerError, ConfigError } from '../core/errors.js';
import type { Result } from '../core/result.js';
import { ok } from '../core/result.js';
import { validateConfigSchema } from '../core/config-schema.js';
import { applyDefaults } from '../core/config-defaults.js';
import { validatePackages } from '../core/validation.js';
import { loadConfigFromFile } from '../adapters/config-file-loader.js';
import { discoverPackages, type DiscoveryWarning } from '../adapters/file-system-discovery.js';
import { buildReport, type ValidationReport } from '../core/report-builder.js';
import { formatConsole } from '../core/formatters/console-formatter.js';
import { formatJson } from '../core/formatters/json-formatter.js';

/**
 * Options for the enforce-layers library API.
 */
export interface EnforceLayersOptions {
    /** Workspace root directory. Defaults to process.cwd(). */
    workspaceRoot?: string;
    /** Path to the config file, relative to workspaceRoot. */
    configPath?: string;
    /** Provide a pre-built config directly, skipping file loading. */
    config?: ResolvedConfig;
    /** Override the enforcement mode from config. */
    mode?: EnforcementConfig['mode'];
}

/**
 * Result of running layer enforcement.
 */
export interface EnforceLayersResult {
    violations: Violation[];
    packages: Package[];
    config: ResolvedConfig;
    report: ValidationReport;
    warnings: DiscoveryWarning[];
}

/**
 * Run layer enforcement programmatically.
 * Returns a Result
 */
export async function enforceLayersAsync(
    options: EnforceLayersOptions = {}
): Promise<Result<EnforceLayersResult, LayerError>> {
    const startTime = performance.now();

    const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());

    // Resolve config
    let config: ResolvedConfig;
    if (options.config) {
        config = options.config;
    } else {
        const configPath = options.configPath ?? 'stratify.config.json';
        const configResult = await loadConfigFromFile(workspaceRoot, configPath);
        if (!configResult.success) {
            return configResult;
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
        return discoveryResult;
    }

    const { packages, warnings } = discoveryResult.value;

    // Validate packages against config
    const violations = validatePackages(packages, config);

    const duration = performance.now() - startTime;
    const report = buildReport(violations, {
        totalPackages: packages.length,
        duration,
    });

    return ok({ violations, packages, config, report, warnings });
}

/**
 * Validate a raw config object without reading from a file.
 * Useful for editor integrations or programmatic config construction.
 */
export function validateConfig(raw: unknown): Result<ResolvedConfig, ConfigError> {
    const validated = validateConfigSchema(raw);
    if (!validated.success) {
        return validated;
    }
    return ok(applyDefaults(validated.value));
}

/**
 * Format an enforcement result for display.
 */
export function formatResults(
    result: EnforceLayersResult,
    format: 'console' | 'json' = 'console',
    mode: EnforcementConfig['mode'] = 'warn'
): string {
    switch (format) {
        case 'json':
            return formatJson(result.report);
        case 'console':
        default:
            return formatConsole(result.report, mode);
    }
}
