import type { ValidationReport } from '../report-builder.js';

/**
 * Format a validation report as a JSON string.
 */
export function formatJson(report: ValidationReport): string {
    return JSON.stringify(
        {
            violations: report.violations,
            totalPackages: report.totalPackages,
            violationCount: report.violationCount,
            duration: report.duration,
        },
        null,
        2
    );
}
