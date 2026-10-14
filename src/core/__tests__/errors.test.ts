import { formatLayerError, StratifyError } from '../errors.js';

describe('formatLayerError', () => {
    it('labels file errors with the configured file description', () => {
        expect(
            formatLayerError({
                type: 'config-not-found',
                message: 'Allowed-packages file not found: /repo/allow.json',
                path: '/repo/allow.json',
                description: 'Allowed-packages file',
            })
        ).toBe('Allowed-packages file not found: /repo/allow.json');
        expect(
            formatLayerError({
                type: 'config-read-error',
                message: 'EACCES: permission denied',
                path: '/repo/exceptions.json',
                description: 'Dependency-exceptions file',
            })
        ).toBe(
            'Failed to read dependency-exceptions file (/repo/exceptions.json): EACCES: permission denied'
        );
        expect(
            formatLayerError({
                type: 'config-parse-error',
                message: 'Unexpected token',
                path: '/repo/exceptions.json',
                description: 'Dependency-exceptions file',
            })
        ).toBe(
            'Invalid JSON in dependency-exceptions file (/repo/exceptions.json): Unexpected token'
        );
    });

    it('keeps the config-file wording when no description is provided', () => {
        expect(
            formatLayerError({ type: 'config-not-found', message: 'missing', path: '/repo/x.json' })
        ).toBe('Config file not found: /repo/x.json');
        expect(
            formatLayerError({ type: 'config-read-error', message: 'boom', path: '/repo/x.json' })
        ).toBe('Failed to read config file (/repo/x.json): boom');
        expect(
            formatLayerError({ type: 'config-parse-error', message: 'bad', path: '/repo/x.json' })
        ).toBe('Invalid JSON in config file (/repo/x.json): bad');
    });

    it('uses the formatted text as the StratifyError message', () => {
        const error = new StratifyError({
            type: 'config-not-found',
            message: 'Dependency-exceptions file not found: /repo/e.json',
            path: '/repo/e.json',
            description: 'Dependency-exceptions file',
        });

        expect(error.type).toBe('config-not-found');
        expect(error.message).toBe('Dependency-exceptions file not found: /repo/e.json');
    });
});
