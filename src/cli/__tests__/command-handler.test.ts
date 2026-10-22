import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { rm, writeFile } from 'fs/promises';
import { handleValidateCommand } from '../command-handler.js';
import type { CliOptions } from '../options.js';
import {
    createDiscoveryWorkspace,
    discoveryScenarios,
} from '../../__tests__/fixtures/discovery-workspace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = resolve(__dirname, '..', '..', '__tests__', 'fixtures');
const MONOREPO_DIR = resolve(FIXTURES_DIR, 'sample-monorepo');
const CONFIGS_DIR = resolve(FIXTURES_DIR, 'configs');

/**
 * Build a CliOptions object with sensible defaults, allowing overrides.
 */
function buildCliOptions(overrides?: Partial<CliOptions>): CliOptions {
    return {
        root: MONOREPO_DIR,
        config: resolve(CONFIGS_DIR, 'valid-config.json'),
        format: 'console',
        ...overrides,
    };
}

// Suppress all console output during tests
beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
    jest.restoreAllMocks();
});

describe('handleValidateCommand', () => {
    describe.each(discoveryScenarios)('%s discovery issues', scenario => {
        it.each(['error', 'warn', 'off'] as const)(
            'reports console and JSON results with the correct exit code in %s mode',
            async mode => {
                const { root, config } = await createDiscoveryWorkspace(scenario);
                try {
                    const logSpy = jest.spyOn(console, 'log');
                    const errorSpy = jest.spyOn(console, 'error');
                    for (const format of ['console', 'json'] as const) {
                        for (const override of [undefined, mode]) {
                            await writeFile(
                                join(root, 'stratify.config.json'),
                                JSON.stringify({
                                    ...config,
                                    enforcement: {
                                        mode:
                                            override === undefined
                                                ? mode
                                                : mode === 'error'
                                                  ? 'warn'
                                                  : 'error',
                                    },
                                })
                            );
                            logSpy.mockClear();
                            errorSpy.mockClear();
                            const exitCode = await handleValidateCommand(
                                buildCliOptions({
                                    root,
                                    config: 'stratify.config.json',
                                    mode: override,
                                    format,
                                })
                            );
                            expect(exitCode).toBe(mode === 'error' ? 1 : 0);
                            const stdout = logSpy.mock.calls.flat().join('\n');
                            const stderr = errorSpy.mock.calls.flat().join('\n');
                            if (format === 'json') {
                                const result = JSON.parse(stdout);
                                expect(logSpy).toHaveBeenCalledTimes(1);
                                expect(errorSpy).not.toHaveBeenCalled();
                                expect(result.violations).toEqual([]);
                                expect(result.discoveryIssues).toHaveLength(mode === 'off' ? 0 : 1);
                                if (mode !== 'off') {
                                    expect(result.discoveryIssues[0].paths[0]).toContain(root);
                                }
                            } else {
                                expect(stdout).not.toContain('All packages comply');
                                if (mode === 'off') {
                                    expect(stderr).toBe('');
                                    expect(stdout).not.toContain('discovery issue');
                                } else {
                                    expect(stderr).toContain('1 discovery issue(s)');
                                    expect(stderr).toContain(root);
                                    if (scenario === 'duplicate') {
                                        expect(stderr).toContain('"duplicate"');
                                        for (const directory of ['a', 'b', 'c']) {
                                            expect(stderr).toContain(
                                                join(root, 'packages', directory, 'package.json')
                                            );
                                        }
                                    }
                                    expect(stdout.includes('not failing build')).toBe(
                                        mode === 'warn'
                                    );
                                }
                            }
                        }
                    }
                } finally {
                    await rm(root, { recursive: true, force: true });
                }
            }
        );
    });

    it('returns exit code 1 when config mode is error and violations exist', async () => {
        // valid-config.json has mode: 'error'; sample-monorepo has a violation.
        const exitCode = await handleValidateCommand(buildCliOptions());

        expect(exitCode).toBe(1);
    });

    it('returns exit code 0 when config mode is warn and violations exist', async () => {
        // Override mode to 'warn' — violations exist but should not fail.
        const exitCode = await handleValidateCommand(buildCliOptions({ mode: 'warn' }));

        expect(exitCode).toBe(0);
    });

    it('uses config file mode (not hardcoded warn) when no --mode flag given', async () => {
        const exitCode = await handleValidateCommand(buildCliOptions({ mode: undefined }));

        expect(exitCode).toBe(1);
    });

    it('CLI --mode flag overrides config mode for exit-code logic', async () => {
        // Config has mode: 'error' but CLI passes --mode warn.
        // Violations exist, but warn mode → exit code 0.
        const exitCode = await handleValidateCommand(buildCliOptions({ mode: 'warn' }));

        expect(exitCode).toBe(0);
    });

    it('returns exit code 0 when mode is off', async () => {
        // mode: 'off' → short-circuits, no violations reported, exit 0.
        const exitCode = await handleValidateCommand(buildCliOptions({ mode: 'off' }));

        expect(exitCode).toBe(0);
    });

    it('returns exit code 1 when config file does not exist', async () => {
        const exitCode = await handleValidateCommand(
            buildCliOptions({ config: 'nonexistent.json' })
        );

        expect(exitCode).toBe(1);
    });

    it('reports skipped validation in off mode without claiming discovery or compliance', async () => {
        const logSpy = jest.spyOn(console, 'log');

        expect(await handleValidateCommand(buildCliOptions({ mode: 'off' }))).toBe(0);
        const output = logSpy.mock.calls.flat().join('\n');
        expect(output).toContain('Enforcement mode: off');
        expect(output).toContain('validation skipped');
        expect(output).not.toContain('Discovered');
        expect(output).not.toContain('All packages comply');
    });

    it.each(['valid-config-with-exception.json', 'valid-config-with-exception-file.json'])(
        'reports exception validation, not compliance, in off mode with %s',
        async filename => {
            const logSpy = jest.spyOn(console, 'log');

            expect(
                await handleValidateCommand(
                    buildCliOptions({ mode: 'off', config: resolve(CONFIGS_DIR, filename) })
                )
            ).toBe(0);
            const output = logSpy.mock.calls.flat().join('\n');
            expect(output).toContain('Discovered 4 packages');
            expect(output).toContain('Accepted 1 dependency exception');
            expect(output).toContain('dependency exceptions validated');
            expect(output).toContain('ordinary violations suppressed');
            expect(output).not.toContain('validation skipped');
            expect(output).not.toContain('All packages comply');
        }
    );

    it.each([
        { mode: 'warn', exitCode: 0, totalPackages: 4, violations: 1 },
        { mode: 'error', exitCode: 1, totalPackages: 4, violations: 1 },
        { mode: 'off', exitCode: 0, totalPackages: 0, violations: 0 },
    ] as const)('outputs only JSON in $mode mode', async expected => {
        const logSpy = jest.spyOn(console, 'log');
        const errorSpy = jest.spyOn(console, 'error');

        const exitCode = await handleValidateCommand(
            buildCliOptions({ mode: expected.mode, format: 'json' })
        );
        const result = JSON.parse(logSpy.mock.calls.flat().join('\n'));

        expect(exitCode).toBe(expected.exitCode);
        expect(result.totalPackages).toBe(expected.totalPackages);
        expect(result.violations).toHaveLength(expected.violations);
        expect(result.acceptedExceptions).toEqual([]);
        expect(result.discoveryIssues).toEqual([]);
        expect(result.duration).toEqual(expect.any(Number));
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it.each(['nonexistent.json', resolve(CONFIGS_DIR, 'invalid-config-bad-mode.json')])(
        'leaves JSON stdout empty on fatal config error: %s',
        async config => {
            const logSpy = jest.spyOn(console, 'log');
            const errorSpy = jest.spyOn(console, 'error');

            const exitCode = await handleValidateCommand(
                buildCliOptions({ config, format: 'json' })
            );

            expect(exitCode).toBe(1);
            expect(logSpy).not.toHaveBeenCalled();
            expect(errorSpy.mock.calls.flat().join('\n')).toMatch(
                /Config file not found|Invalid enforcement mode/
            );
        }
    );

    it('reports accepted exceptions separately in console and JSON output', async () => {
        const config = resolve(CONFIGS_DIR, 'valid-config-with-exception.json');
        const logSpy = jest.spyOn(console, 'log');

        expect(await handleValidateCommand(buildCliOptions({ config, format: 'console' }))).toBe(0);
        expect(logSpy.mock.calls.flat().join('\n')).toContain('Accepted 1 dependency exception');

        logSpy.mockClear();
        expect(await handleValidateCommand(buildCliOptions({ config, format: 'json' }))).toBe(0);
        const output = logSpy.mock.calls.flat().join('\n');

        expect(JSON.parse(output)).toMatchObject({
            violations: [],
            acceptedExceptions: [{ acceptedEdges: [{ fromPackage: '@sample/bad-pkg' }] }],
        });
    });

    it('reports accepted exceptions loaded from a file', async () => {
        const config = resolve(CONFIGS_DIR, 'valid-config-with-exception-file.json');
        const logSpy = jest.spyOn(console, 'log');

        expect(await handleValidateCommand(buildCliOptions({ config, format: 'json' }))).toBe(0);
        const output = logSpy.mock.calls.flat().join('\n');

        expect(JSON.parse(output)).toMatchObject({
            violations: [],
            acceptedExceptions: [{ acceptedEdges: [{ fromPackage: '@sample/bad-pkg' }] }],
        });
    });
});
