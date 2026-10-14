import { parseCliOptions, toLibraryOptions } from '../options.js';
import { StratifyError } from '../../core/errors.js';

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

    it.each(['error', 'warn', 'off'])('accepts mode %s', mode => {
        expect(parseCliOptions({ mode }).mode).toBe(mode);
    });

    it.each(['console', 'json'])('accepts format %s', format => {
        expect(parseCliOptions({ format }).format).toBe(format);
    });

    it.each([
        { mode: 'bogus' },
        { mode: '' },
        { mode: null },
        { mode: false },
        { mode: 0 },
        { mode: ['warn'] },
        { format: 'bogus' },
        { format: '' },
        { format: null },
        { format: false },
        { format: 0 },
        { format: ['json'] },
    ])('rejects invalid option values: %j', raw => {
        expect(() => parseCliOptions(raw)).toThrow(StratifyError);
        expect(() => parseCliOptions(raw)).toThrow(
            /Invalid enforcement mode.*error.*warn.*off|Invalid output format.*console.*json/
        );
    });
});

describe('toLibraryOptions', () => {
    it('returns configPath', () => {
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

    it('passes CLI mode through', () => {
        const result = toLibraryOptions({
            root: '/workspace',
            config: 'stratify.config.json',
            mode: 'error',
            format: 'console',
        });

        expect(result.mode).toBe('error');
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
