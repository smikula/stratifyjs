/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ['**/src/**/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                diagnostics: {
                    // This suppresses the TS151002 warning specifically.
                    // It's safe — ts-jest works fine with NodeNext in ESM mode
                    ignoreCodes: [151002],
                },
            },
        ],
    },
    testEnvironment: 'node',
};

export default config;
