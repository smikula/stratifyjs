import { jest } from '@jest/globals';

describe('CLI entry point', () => {
    it('prints help usage with the installed bin name', async () => {
        const originalArgv = process.argv;
        let output = '';
        const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(chunk => {
            output += String(chunk);
            return true;
        });
        // Commander exits after printing help; stop module evaluation instead of the test run.
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`process.exit(${code})`);
        });
        process.argv = ['node', 'stratify', '--help'];

        try {
            await expect(import('../index.js')).rejects.toThrow('process.exit(0)');
        } finally {
            process.argv = originalArgv;
            writeSpy.mockRestore();
            exitSpy.mockRestore();
        }

        expect(output).toMatch(/^Usage: stratify \[options\]$/m);
    });
});
