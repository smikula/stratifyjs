import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { enforceLayersAsync, validateConfig, formatResults } from '../api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = resolve(__dirname, '..', '..', '__tests__', 'fixtures');
const MONOREPO_DIR = resolve(FIXTURES_DIR, 'sample-monorepo');
const CONFIGS_DIR = resolve(FIXTURES_DIR, 'configs');

describe('enforceLayersAsync', () => {
    it('runs the full pipeline and finds the expected violation', async () => {
        // Load config from the fixture file, discover from sample monorepo
        const result = await enforceLayersAsync({
            workspaceRoot: MONOREPO_DIR,
            configPath: resolve(CONFIGS_DIR, 'valid-config.json'),
        });

        expect(result.success).toBe(true);
        if (result.success) {
            const { packages, violations, report, config } = result.value;

            // Should discover all 4 packages
            expect(packages).toHaveLength(4);

            // Config should be loaded correctly
            expect(config.enforcement.mode).toBe('error');
            expect(Object.keys(config.layers)).toHaveLength(3);

            // Should find exactly 1 violation: bad-pkg (ui) → infra
            expect(violations).toHaveLength(1);
            expect(violations[0].type).toBe('invalid-dependency');
            expect(violations[0].package).toBe('@sample/bad-pkg');
            expect(violations[0].details?.toLayer).toBe('infra');
            expect(violations[0].details?.fromLayer).toBe('ui');

            // Report should reflect the violation
            expect(report.violationCount).toBe(1);
            expect(report.totalPackages).toBe(4);
        }
    });

    it('works with a pre-built config (skips file loading)', async () => {
        // Provide config directly instead of loading from file
        const result = await enforceLayersAsync({
            workspaceRoot: MONOREPO_DIR,
            config: {
                layers: {
                    ui: { allowedDependencies: ['core'] },
                    core: { allowedDependencies: ['infra'] },
                    infra: { allowedDependencies: [] },
                },
                enforcement: { mode: 'warn' },
                workspaces: { patterns: ['packages/*'] },
            },
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.packages).toHaveLength(4);
            // Same violation as above — config structure is equivalent
            expect(result.value.violations).toHaveLength(1);
            expect(result.value.violations[0].package).toBe('@sample/bad-pkg');
        }
    });

    it('returns zero violations when all dependencies are allowed via wildcard', async () => {
        const result = await enforceLayersAsync({
            workspaceRoot: MONOREPO_DIR,
            config: {
                layers: {
                    ui: { allowedDependencies: ['*'] }, // allow everything
                    core: { allowedDependencies: ['*'] },
                    infra: { allowedDependencies: [] },
                },
                enforcement: { mode: 'error' },
                workspaces: { patterns: ['packages/*'] },
            },
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.violations).toHaveLength(0);
        }
    });

    it('returns config-not-found when config file does not exist', async () => {
        const result = await enforceLayersAsync({
            workspaceRoot: MONOREPO_DIR,
            configPath: 'nonexistent.json',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-not-found');
        }
    });

    it('applies mode override from options', async () => {
        const result = await enforceLayersAsync({
            workspaceRoot: MONOREPO_DIR,
            config: {
                layers: {
                    ui: { allowedDependencies: ['core'] },
                    core: { allowedDependencies: ['infra'] },
                    infra: { allowedDependencies: [] },
                },
                enforcement: { mode: 'warn' },
                workspaces: { patterns: ['packages/*'] },
            },
            mode: 'off', // override from options
        });

        expect(result.success).toBe(true);
        if (result.success) {
            // The mode override should be reflected in the config
            expect(result.value.config.enforcement.mode).toBe('off');
        }
    });
});

describe('validateConfig', () => {
    it('validates and applies defaults to a raw config object', () => {
        const raw = {
            layers: {
                core: { allowedDependencies: [] },
            },
        };

        const result = validateConfig(raw);

        expect(result.success).toBe(true);
        if (result.success) {
            // Defaults should be applied
            expect(result.value.enforcement.mode).toBe('warn');
            expect(result.value.workspaces.patterns).toEqual(['packages/**/*']);
        }
    });

    it('rejects invalid raw config', () => {
        const result = validateConfig({ enforcement: { mode: 'warn' } });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-validation-error');
        }
    });
});

describe('formatResults', () => {
    it('formats as console text by default', async () => {
        const result = await enforceLayersAsync({
            workspaceRoot: MONOREPO_DIR,
            config: {
                layers: {
                    ui: { allowedDependencies: ['core'] },
                    core: { allowedDependencies: ['infra'] },
                    infra: { allowedDependencies: [] },
                },
                enforcement: { mode: 'warn' },
                workspaces: { patterns: ['packages/*'] },
            },
        });

        expect(result.success).toBe(true);
        if (result.success) {
            const output = formatResults(result.value);
            // Should contain violation info
            expect(output).toContain('1 layer violation');
            expect(output).toContain('Completed in');
        }
    });

    it('formats as JSON when requested', async () => {
        const result = await enforceLayersAsync({
            workspaceRoot: MONOREPO_DIR,
            config: {
                layers: {
                    ui: { allowedDependencies: ['core'] },
                    core: { allowedDependencies: ['infra'] },
                    infra: { allowedDependencies: [] },
                },
                enforcement: { mode: 'error' },
                workspaces: { patterns: ['packages/*'] },
            },
        });

        expect(result.success).toBe(true);
        if (result.success) {
            const output = formatResults(result.value, 'json');
            // Should be valid JSON
            const parsed = JSON.parse(output);
            expect(parsed.violationCount).toBe(1);
            expect(parsed.violations).toHaveLength(1);
            expect(parsed.totalPackages).toBe(4);
        }
    });
});
