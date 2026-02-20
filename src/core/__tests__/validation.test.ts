import { validatePackages } from '../validation.js';
import { createTestConfig, createTestPackage } from '../../__tests__/fixtures/helpers.js';
import type { Package, StratifyConfig } from '../../types/types.js';

describe('validatePackages', () => {
    let config: StratifyConfig;

    beforeEach(() => {
        config = createTestConfig();
    });

    // ── All valid ──────────────────────────────────────────────────────
    it('returns no violations when all packages are valid', () => {
        const packages: Package[] = [
            createTestPackage({ name: '@app/ui', layer: 'ui', dependencies: ['@app/core'] }),
            createTestPackage({ name: '@app/core', layer: 'core', dependencies: ['@app/infra'] }),
            createTestPackage({ name: '@app/infra', layer: 'infra', dependencies: [] }),
        ];

        const violations = validatePackages(packages, config);

        expect(violations).toHaveLength(0);
    });

    // ── Missing layer ──────────────────────────────────────────────────
    it('returns a missing-layer violation when layer is undefined', () => {
        const packages: Package[] = [
            createTestPackage({ name: '@app/no-layer', layer: undefined }),
        ];

        const violations = validatePackages(packages, config);

        expect(violations).toHaveLength(1);
        expect(violations[0].type).toBe('missing-layer');
        expect(violations[0].package).toBe('@app/no-layer');
        expect(violations[0].message).toContain('missing');
        // detailedMessage should include actionable guidance
        expect(violations[0].detailedMessage).toContain('@app/no-layer');
        expect(violations[0].detailedMessage).toContain('Missing Layer');
    });

    // ── Unknown layer ──────────────────────────────────────────────────
    it('returns an unknown-layer violation for unrecognized layer names', () => {
        const packages: Package[] = [createTestPackage({ name: '@app/mystery', layer: 'data' })];

        const violations = validatePackages(packages, config);

        expect(violations).toHaveLength(1);
        expect(violations[0].type).toBe('unknown-layer');
        expect(violations[0].package).toBe('@app/mystery');
        // The message should list valid layers so the user can fix it
        expect(violations[0].message).toContain('ui');
        expect(violations[0].message).toContain('core');
        expect(violations[0].message).toContain('infra');
    });

    // ── Invalid dependency ─────────────────────────────────────────────
    it('returns an invalid-dependency violation for disallowed cross-layer deps', () => {
        const packages: Package[] = [
            createTestPackage({ name: '@app/ui', layer: 'ui', dependencies: ['@app/infra'] }),
            createTestPackage({ name: '@app/infra', layer: 'infra', dependencies: [] }),
        ];

        const violations = validatePackages(packages, config);

        expect(violations).toHaveLength(1);
        expect(violations[0].type).toBe('invalid-dependency');
        expect(violations[0].package).toBe('@app/ui');
        // Check the structured details — this is how consumers programmatically
        // inspect violations, not just the message string.
        expect(violations[0].details).toEqual({
            fromLayer: 'ui',
            toPackage: '@app/infra',
            toLayer: 'infra',
            allowedLayers: ['core'],
        });
    });

    // ── External deps are skipped ──────────────────────────────────────
    it('skips dependencies that are not in the packages list (external deps)', () => {
        const packages: Package[] = [
            createTestPackage({
                name: '@app/ui',
                layer: 'ui',
                dependencies: ['react', 'lodash'], // not workspace packages
            }),
        ];

        const violations = validatePackages(packages, config);

        expect(violations).toHaveLength(0);
    });

    // ── Deps with no layer are skipped ─────────────────────────────────
    it('skips dependencies that have no layer defined', () => {
        const packages: Package[] = [
            createTestPackage({ name: '@app/ui', layer: 'ui', dependencies: ['@app/utils'] }),
            createTestPackage({ name: '@app/utils', layer: undefined, dependencies: [] }),
        ];

        const violations = validatePackages(packages, config);

        // @app/utils has no layer, so it should not produce a violation
        // for @app/ui's dependency on it. (It will produce its own
        // missing-layer violation.)
        const depViolations = violations.filter(v => v.type === 'invalid-dependency');
        expect(depViolations).toHaveLength(0);
    });

    // ── Multiple violations ────────────────────────────────────────────
    it('collects multiple violations across packages', () => {
        const packages: Package[] = [
            createTestPackage({ name: '@app/no-layer', layer: undefined }),
            createTestPackage({ name: '@app/bad-layer', layer: 'unknown' }),
            createTestPackage({ name: '@app/ui', layer: 'ui', dependencies: ['@app/infra'] }),
            createTestPackage({ name: '@app/infra', layer: 'infra', dependencies: [] }),
        ];

        const violations = validatePackages(packages, config);

        // One missing-layer + one unknown-layer + one invalid-dependency
        expect(violations).toHaveLength(3);
        const types = violations.map(v => v.type);
        expect(types).toContain('missing-layer');
        expect(types).toContain('unknown-layer');
        expect(types).toContain('invalid-dependency');
    });

    // ── Wildcard allowedDependencies ───────────────────────────────────
    it('allows all dependencies when allowedDependencies contains "*"', () => {
        const wildcardConfig = createTestConfig({
            layers: {
                ui: { allowedDependencies: ['*'] }, // allow everything
                core: { allowedDependencies: [] },
                infra: { allowedDependencies: [] },
            },
        });

        const packages: Package[] = [
            createTestPackage({
                name: '@app/ui',
                layer: 'ui',
                dependencies: ['@app/core', '@app/infra'],
            }),
            createTestPackage({ name: '@app/core', layer: 'core', dependencies: [] }),
            createTestPackage({ name: '@app/infra', layer: 'infra', dependencies: [] }),
        ];

        const violations = validatePackages(packages, wildcardConfig);

        expect(violations).toHaveLength(0);
    });
});
