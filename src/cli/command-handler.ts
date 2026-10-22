import { resolve } from 'path';
import { loadConfigFromFile } from '../adapters/config-file-loader.js';
import { validateLayers } from '../api/api.js';
import { StratifyError } from '../core/errors.js';
import { toLibraryOptions, type CliOptions } from './options.js';
import { logInfo, logSuccess, logError, logGray, logPlain } from './output-helpers.js';

/**
 * Handle the main validate command.
 * Returns an exit code: 0 = success, 1 = failure.
 */
export async function handleValidateCommand(options: CliOptions): Promise<number> {
    const workspaceRoot = resolve(options.root);
    const configPath = resolve(workspaceRoot, options.config);

    if (options.format === 'console') {
        logInfo('🔍 Enforce Layers\n');
        logGray(`Root: ${workspaceRoot}`);
        logGray(`Config: ${configPath}\n`);
    }

    try {
        // Load config in the CLI so we can read the resolved enforcement mode
        const configResult = await loadConfigFromFile(workspaceRoot, options.config);
        if (!configResult.success) {
            throw new StratifyError(configResult.error);
        }
        const config = configResult.value;

        // CLI --mode flag overrides the config file's mode
        const effectiveMode = options.mode ?? config.enforcement.mode;

        const result = await validateLayers(toLibraryOptions(options));

        if (options.format === 'json') {
            logPlain(JSON.stringify(result, null, 2));
        } else {
            if (effectiveMode !== 'off' || result.acceptedExceptions.length > 0) {
                logSuccess(`✅ Discovered ${result.totalPackages} packages\n`);
            }

            if (result.acceptedExceptions.length > 0) {
                logInfo(
                    `📌 Accepted ${result.acceptedExceptions.length} dependency exception(s):\n`
                );
                for (const usage of result.acceptedExceptions) {
                    for (const edge of usage.acceptedEdges) {
                        logPlain(
                            `   ${edge.fromPackage} (${edge.fromLayer}) → ${edge.toPackage} (${edge.toLayer})`
                        );
                    }
                    logGray(
                        `   Owner: ${usage.exception.owner} | Reason: ${usage.exception.reason}\n`
                    );
                }
            }

            if (result.discoveryIssues.length > 0) {
                logError(`Found ${result.discoveryIssues.length} discovery issue(s):\n`);
                for (const issue of result.discoveryIssues) {
                    logError(`[${issue.type}] ${issue.message}`);
                    for (const path of issue.paths) {
                        logError(`   ${path}`);
                    }
                    logPlain('');
                }
            }

            if (effectiveMode === 'off') {
                logPlain(
                    result.acceptedExceptions.length === 0
                        ? 'Enforcement mode: off — validation skipped'
                        : 'Enforcement mode: off — dependency exceptions validated; ordinary violations suppressed; discovery issues suppressed'
                );
            } else if (result.violations.length === 0) {
                if (result.discoveryIssues.length === 0) {
                    logSuccess('✅ All packages comply with layer rules!');
                }
            } else {
                logError(`❌ Found ${result.violations.length} layer violation(s):\n`);
                for (const v of result.violations) {
                    logError(v.detailedMessage);
                    logPlain('');
                }
            }
            if (
                effectiveMode === 'warn' &&
                (result.violations.length > 0 || result.discoveryIssues.length > 0)
            ) {
                logPlain('⚠️  Enforcement mode: warn — not failing build');
            }
        }

        if (
            effectiveMode === 'error' &&
            (result.violations.length > 0 || result.discoveryIssues.length > 0)
        ) {
            return 1;
        }

        return 0;
    } catch (error) {
        if (error instanceof StratifyError) {
            logError(`❌ ${error.message}`);
        } else {
            logError(`❌ Unexpected error: ${error}`);
        }
        return 1;
    }
}
