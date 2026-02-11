import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { loadConfigFromFile } from '../config-file-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = resolve(__dirname, '..', '..', '__tests__', 'fixtures');
const CONFIGS_DIR = resolve(FIXTURES_DIR, 'configs');

describe('loadConfigFromFile', () => {
    it('loads and resolves a valid config file', async () => {
        const result = await loadConfigFromFile(CONFIGS_DIR, 'valid-config.json');

        expect(result.success).toBe(true);
        if (result.success) {
            // Verify layers were parsed correctly
            expect(Object.keys(result.value.layers)).toEqual(['ui', 'core', 'infra']);
            expect(result.value.layers.ui.allowedDependencies).toEqual(['core']);
            expect(result.value.layers.core.allowedDependencies).toEqual(['infra']);
            expect(result.value.layers.infra.allowedDependencies).toEqual([]);

            // Verify enforcement was parsed (not defaulted)
            expect(result.value.enforcement.mode).toBe('error');

            // Verify workspaces were parsed
            expect(result.value.workspaces.patterns).toEqual(['packages/*']);
        }
    });

    it('returns config-validation-error when layers field is missing', async () => {
        const result = await loadConfigFromFile(CONFIGS_DIR, 'invalid-config-no-layers.json');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-validation-error');
            expect(result.error.message).toContain('layers');
        }
    });

    it('returns config-validation-error for invalid enforcement mode', async () => {
        const result = await loadConfigFromFile(CONFIGS_DIR, 'invalid-config-bad-mode.json');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-validation-error');
            expect(result.error.message).toContain('strict');
        }
    });

    it('returns config-not-found for a nonexistent file', async () => {
        const result = await loadConfigFromFile(CONFIGS_DIR, 'does-not-exist.json');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('config-not-found');
        }
    });

    it('returns config-parse-error for invalid JSON', async () => {
        // Create a temporary file with invalid JSON
        const badJsonPath = resolve(CONFIGS_DIR, '_temp-bad.json');
        await writeFile(badJsonPath, '{not valid json!!!', 'utf-8');

        try {
            const result = await loadConfigFromFile(CONFIGS_DIR, '_temp-bad.json');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.type).toBe('config-parse-error');
            }
        } finally {
            // Clean up temp file regardless of test outcome
            await unlink(badJsonPath).catch(() => {});
        }
    });
});
