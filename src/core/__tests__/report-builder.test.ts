import { buildReport } from '../report-builder.js';
import { createTestViolation } from '../../__tests__/fixtures/helpers.js';
import type { Violation } from '../../types/types.js';

describe('buildReport', () => {
    it('returns zero counts when there are no violations', () => {
        const report = buildReport([], { totalPackages: 5, duration: 42 });

        expect(report.violationCount).toBe(0);
        expect(report.violations).toHaveLength(0);
        expect(report.violationsByType).toEqual({});
        // Metadata passes through
        expect(report.totalPackages).toBe(5);
        expect(report.duration).toBe(42);
    });

    it('groups violations by type correctly', () => {
        const violations: Violation[] = [
            createTestViolation({ type: 'missing-layer', package: 'pkg-a' }),
            createTestViolation({ type: 'missing-layer', package: 'pkg-b' }),
            createTestViolation({ type: 'unknown-layer', package: 'pkg-c' }),
            createTestViolation({ type: 'invalid-dependency', package: 'pkg-d' }),
        ];

        const report = buildReport(violations, { totalPackages: 10, duration: 100 });

        expect(report.violationCount).toBe(4);

        // ── Check grouping ────────────────────────────────────────────
        // violationsByType should have 3 keys, with the right counts
        expect(report.violationsByType['missing-layer']).toHaveLength(2);
        expect(report.violationsByType['unknown-layer']).toHaveLength(1);
        expect(report.violationsByType['invalid-dependency']).toHaveLength(1);
    });

    it('passes through totalPackages and duration metadata', () => {
        const report = buildReport([createTestViolation()], { totalPackages: 42, duration: 999 });

        expect(report.totalPackages).toBe(42);
        expect(report.duration).toBe(999);
    });
});
