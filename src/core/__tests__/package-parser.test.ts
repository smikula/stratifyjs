import { parsePackageJson, extractWorkspaceDependencies } from '../package-parser.js';

describe('parsePackageJson', () => {
    it('parses a valid package.json with layer and workspace deps', () => {
        const content = {
            name: '@my/ui',
            version: '1.0.0',
            layer: 'ui',
            dependencies: {
                '@my/core': 'workspace:*',
                react: '^18.0.0', // not a workspace dep
            },
            devDependencies: {
                '@my/test-utils': 'workspace:^',
            },
        };

        const result = parsePackageJson(content, 'packages/ui');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.name).toBe('@my/ui');
            expect(result.value.layer).toBe('ui');
            expect(result.value.path).toBe('packages/ui');
            // Only workspace: deps should be extracted
            expect(result.value.dependencies).toContain('@my/core');
            expect(result.value.dependencies).toContain('@my/test-utils');
            expect(result.value.dependencies).not.toContain('react');
        }
    });

    it('parses a package without a layer (layer is optional)', () => {
        const content = { name: '@my/utils', version: '1.0.0' };

        const result = parsePackageJson(content, 'packages/utils');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.layer).toBeUndefined();
        }
    });

    it('returns error for non-object content', () => {
        const result = parsePackageJson('string', 'packages/bad');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('package-parse-error');
            expect(result.error.message).toContain('JSON object');
        }
    });

    it('returns error for null content', () => {
        const result = parsePackageJson(null, 'packages/bad');
        expect(result.success).toBe(false);
    });

    it('returns error when name is missing', () => {
        const result = parsePackageJson({ version: '1.0.0' }, 'packages/no-name');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('package-parse-error');
            expect(result.error.message).toContain('name');
        }
    });

    it('returns error when name is empty string', () => {
        const result = parsePackageJson({ name: '' }, 'packages/empty-name');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.type).toBe('package-parse-error');
        }
    });
});

describe('extractWorkspaceDependencies', () => {
    it('extracts only workspace: protocol dependencies', () => {
        const deps = extractWorkspaceDependencies(
            { '@my/core': 'workspace:*', react: '^18.0.0' },
            undefined,
            undefined
        );

        expect(deps).toEqual(['@my/core']);
    });

    it('extracts from devDependencies and peerDependencies too', () => {
        const deps = extractWorkspaceDependencies(
            { '@my/core': 'workspace:*' },
            { '@my/test': 'workspace:^' },
            { '@my/shared': 'workspace:~' }
        );

        expect(deps).toHaveLength(3);
        expect(deps).toContain('@my/core');
        expect(deps).toContain('@my/test');
        expect(deps).toContain('@my/shared');
    });

    it('returns empty array when no workspace deps exist', () => {
        const deps = extractWorkspaceDependencies(
            { react: '^18.0.0', lodash: '^4.0.0' },
            undefined,
            undefined
        );

        expect(deps).toEqual([]);
    });

    it('handles undefined deps objects', () => {
        const deps = extractWorkspaceDependencies(undefined, undefined, undefined);
        expect(deps).toEqual([]);
    });
});
