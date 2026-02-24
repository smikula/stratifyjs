import { parseCliOptions, toLibraryOptions } from '../options.js';
import { createTestConfig } from '../../__tests__/fixtures/helpers.js';

describe('parseCliOptions', () => {
    it('parses all provided options', () => {
        const result = parseCliOptions({
            config: 'my-config.json',
            root: '/workspace',
            mode: 'error',
            format: 'json',
        });

        expect(result).toEqual({
            config: 'my-config.json',
            root: '/workspace',
            mode: 'error',
            format: 'json',
        });
    });

    it('defaults config to stratify.config.json when not provided', () => {
        const result = parseCliOptions({});
        expect(result.config).toBe('stratify.config.json');
    });

    it('defaults format to console when not provided', () => {
        const result = parseCliOptions({});
        expect(result.format).toBe('console');
    });

    it('defaults mode to undefined when not provided', () => {
        // This is important: mode must be undefined (not 'warn') so the API
        // and CLI can fall back to the config file's mode instead.
        const result = parseCliOptions({});
        expect(result.mode).toBeUndefined();
    });
});

describe('toLibraryOptions', () => {
    it('returns configPath when no resolvedConfig is provided', () => {
        const result = toLibraryOptions({
            root: '/workspace',
            config: 'stratify.config.json',
            format: 'console',
        });

        expect(result).toEqual({
            workspaceRoot: '/workspace',
            configPath: 'stratify.config.json',
            mode: undefined,
        });
        expect(result).not.toHaveProperty('config');
    });

    it('returns config object when resolvedConfig is provided', () => {
        const config = createTestConfig();
        const result = toLibraryOptions(
            { root: '/workspace', config: 'stratify.config.json', format: 'console' },
            config
        );

        expect(result.config).toBe(config);
        expect(result).not.toHaveProperty('configPath');
        expect(result.workspaceRoot).toBe('/workspace');
    });

    it('passes CLI mode through regardless of resolvedConfig', () => {
        const config = createTestConfig({ enforcement: { mode: 'warn' } });
        const result = toLibraryOptions(
            {
                root: '/workspace',
                config: 'stratify.config.json',
                mode: 'error',
                format: 'console',
            },
            config
        );

        expect(result.mode).toBe('error');
        expect(result.config).toBe(config);
    });

    it('passes undefined mode when CLI mode is not set', () => {
        const result = toLibraryOptions({
            root: '/workspace',
            config: 'stratify.config.json',
            format: 'console',
        });

        expect(result.mode).toBeUndefined();
    });
});
