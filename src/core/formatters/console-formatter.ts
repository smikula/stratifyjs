import type { ValidationReport } from '../report-builder.js';
import type { ViolationType, EnforcementConfig } from '../../types/types.js';

const TYPE_LABELS: Record<ViolationType, string> = {
    'missing-layer': '🏷️  Missing Layer',
    'unknown-layer': '❓ Unknown Layer',
    'invalid-dependency': '🚫 Invalid Dependency',
};

export function formatConsole(report: ValidationReport, mode: EnforcementConfig['mode']): string {
    const lines: string[] = [];
    const durationStr = formatDuration(report.duration);

    if (report.violations.length === 0) {
        lines.push('✅ All packages comply with layer rules!');
        lines.push(`\n⏱️  Completed in ${durationStr}`);
        return lines.join('\n');
    }

    lines.push(`❌ Found ${report.violationCount} layer violations:\n`);

    for (const [type, violations] of Object.entries(report.violationsByType)) {
        if (!violations || violations.length === 0) {
            continue;
        }
        const label = TYPE_LABELS[type as ViolationType] ?? type;
        lines.push(`  ${label} (${violations.length}):`);
        for (const v of violations) {
            lines.push(`    • ${v.message}`);
        }
        lines.push('');
    }

    lines.push(`⏱️  Completed in ${durationStr}`);

    if (mode === 'warn') {
        lines.push('\n⚠️  Enforcement mode: warn - not failing build');
    }

    return lines.join('\n');
}

function formatDuration(ms: number): string {
    return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}
