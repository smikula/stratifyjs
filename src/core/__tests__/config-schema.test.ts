import { validateConfigSchema, validateLayerDefinition } from '../config-schema.js';

describe('validateConfigSchema', () => {
    it('returns ok for a valid minimal config', () => {
        const raw = {
            layers: {
                ui: { allowedDependencies: ['core'] },
                core: { allowedDependencies: [] },
            },
        };

        const result = validateConfigSchema(raw);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.layers).toEqual(raw.layers);
            expect(result.value.enforcement).toBeUndefined();
            expect(result.value.workspaces).toBeUndefined();
        }
    });

    it('returns ok for a full config with enforcement and workspaces', () => {
        const raw = {
            layers: {
                ui: { allowedDependencies: ['core'] },
                core: { allowedDependencies: ['infra'] },
                infra: { allowedDependencies: [] },
            },
            enforcement: { mode: 'error' },
            workspaces: { patterns: ['apps/*', 'libs/*'] },
        };

        const result = validateConfigSchema(raw);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.enforcement).toEqual({ mode: 'error' });
            expect(result.value.workspaces).toEqual({ patterns: ['apps/*', 'libs/*'] });
        }
    });

    // ── Error cases ─────────────────────────────────────────────────────

    it('returns error for non-object input (string)', () => {
        const result = validateConfigSchema('not an object');
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-validation-error');
            expect(result.error.message).toContain('JSON object');
        }
    });

    it('returns error for null input', () => {
        const result = validateConfigSchema(null);
        expect(result.success).toBe(false);
    });

    it('returns error for array input', () => {
        const result = validateConfigSchema([1, 2, 3]);
        expect(result.success).toBe(false);
    });

    it('returns error when layers field is missing', () => {
        const result = validateConfigSchema({ enforcement: { mode: 'warn' } });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-validation-error');
            expect(result.error.message).toContain('layers');
        }
    });

    it('returns error when a layer is missing allowedDependencies', () => {
        const raw = {
            layers: {
                ui: { description: 'UI layer' }, // missing allowedDependencies!
            },
        };

        const result = validateConfigSchema(raw);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-validation-error');
            expect(result.error.message).toContain('Invalid layer definitions');
        }
    });

    it('returns error when allowedDependencies contains non-strings', () => {
        const raw = {
            layers: {
                ui: { allowedDependencies: [123, true] },
            },
        };

        const result = validateConfigSchema(raw);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain('Invalid layer definitions');
        }
    });

    it('returns error for invalid enforcement mode', () => {
        const raw = {
            layers: {
                core: { allowedDependencies: [] },
            },
            enforcement: { mode: 'strict' }, // invalid!
        };

        const result = validateConfigSchema(raw);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain('strict');
            // Should mention the valid modes so the user knows what to fix
            expect(result.error.message).toMatch(/error.*warn.*off/);
        }
    });

    it('returns error for invalid workspaces.patterns (non-array)', () => {
        const raw = {
            layers: {
                core: { allowedDependencies: [] },
            },
            workspaces: { patterns: 'not-an-array' },
        };

        const result = validateConfigSchema(raw);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain('array of strings');
        }
    });
});

describe('validateLayerDefinition', () => {
    it('returns ok for a valid layer definition', () => {
        const result = validateLayerDefinition('ui', {
            description: 'UI packages',
            allowedDependencies: ['core'],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.allowedDependencies).toEqual(['core']);
            expect(result.value.description).toBe('UI packages');
        }
    });

    it('returns error when the layer is not an object', () => {
        const result = validateLayerDefinition('ui', 'invalid');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain('ui');
            expect(result.error.message).toContain('must be an object');
        }
    });

    it('returns error when the layer is an array', () => {
        const result = validateLayerDefinition('ui', ['core']);

        expect(result.success).toBe(false);
    });
});
