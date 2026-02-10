import { resolve } from 'path';
import { enforceLayersAsync, formatResults } from '../api/api.js';
import { formatLayerError } from '../api/index.js';
import type { CliOptions } from './options.js';
import { toLibraryOptions } from './options.js';
import { logInfo, logSuccess, logWarning, logError, logGray, logPlain } from './output-helpers.js';

/**
 * Handle the main enforce command.
 * Returns an exit code: 0 = success, 1 = failure.
 */
export async function handleEnforceCommand(options: CliOptions): Promise<number> {
    const workspaceRoot = resolve(options.root);
    const configPath = resolve(workspaceRoot, options.config);

    logInfo('🔍 Enforce Layers\n');
    logGray(`Root: ${workspaceRoot}`);
    logGray(`Config: ${configPath}\n`);

    const result = await enforceLayersAsync(toLibraryOptions(options));

    if (!result.success) {
        logError(`❌ ${formatLayerError(result.error)}`);
        return 1;
    }

    const { config, packages, violations, warnings } = result.value;
    const effectiveMode = options.mode ?? config.enforcement.mode;

    logSuccess(`✅ Loaded config with ${Object.keys(config.layers).length} layers`);
    logGray(`   Mode: ${effectiveMode}\n`);
    logSuccess(`✅ Discovered ${packages.length} packages\n`);
    if (warnings.length > 0) {
        logWarning(`⚠️  ${warnings.length} warnings\n`);
        for (const warning of warnings) {
            logWarning(`   • ${warning.path}: ${warning.message}`);
        }
        logPlain('');
    }

    // Get plain text report from formatter, add colors here
    const plainReport = formatResults(result.value, options.format, effectiveMode);

    if (options.format === 'json') {
        logPlain(plainReport);
    } else {
        if (violations.length > 0) {
            logError(plainReport);
        } else {
            logSuccess(plainReport);
        }
    }

    if (effectiveMode === 'error' && violations.length > 0) {
        return 1;
    }

    return 0;
}
