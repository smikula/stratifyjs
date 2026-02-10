import type { Violation, ViolationType } from '../types/types.js';

/**
 * Structured report produced after validation.
 */
export interface ValidationReport {
    violations: Violation[];
    totalPackages: number;
    violationsByType: Partial<Record<ViolationType, Violation[]>>;
    violationCount: number;
    duration: number;
}

/**
 * Build a structured report from violations and metadata.
 */
export function buildReport(
    violations: Violation[],
    metadata: { totalPackages: number; duration: number }
): ValidationReport {
    const violationsByType: Partial<Record<ViolationType, Violation[]>> = {};

    // Group violations by type for easier reporting
    for (const violation of violations) {
        (violationsByType[violation.type] ??= []).push(violation);
    }

    return {
        violations,
        totalPackages: metadata.totalPackages,
        violationsByType,
        violationCount: violations.length,
        duration: metadata.duration,
    };
}
