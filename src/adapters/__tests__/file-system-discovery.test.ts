import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { tmpdir } from 'os';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { discoverPackages } from '../file-system-discovery.js';
import {
    createDiscoveryWorkspace,
    discoveryScenarios,
} from '../../__tests__/fixtures/discovery-workspace.js';
import { applyDefaults } from '../../core/config-defaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MONOREPO_DIR = resolve(__dirname, '..', '..', '__tests__', 'fixtures', 'sample-monorepo');

describe('discoverPackages', () => {
    it.each(discoveryScenarios)('preserves discovery details for %s', async scenario => {
        const { root, config } = await createDiscoveryWorkspace(scenario);
        try {
            const result = await discoverPackages(root, applyDefaults(config).workspaces);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }
            const { packages, warnings } = result.value;
            if (scenario === 'empty') {
                expect(packages).toEqual([]);
                expect(warnings).toEqual([]);
            } else if (scenario === 'duplicate') {
                expect(packages.filter(pkg => pkg.name === 'duplicate')).toHaveLength(3);
                expect(warnings).toEqual([]);
            } else {
                expect(packages.map(pkg => pkg.name)).toEqual(['healthy']);
                expect(warnings).toEqual([
                    {
                        path: join(root, 'packages', 'broken', 'package.json'),
                        message: expect.any(String),
                    },
                ]);
                expect(warnings[0].message.length).toBeGreaterThan(0);
            }
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('does not count overlapping patterns as duplicate manifests', async () => {
        const result = await discoverPackages(MONOREPO_DIR, {
            patterns: ['packages/*', 'packages/**/*'],
            protocols: ['workspace:'],
            ignore: [],
            dependencyTypes: ['dependencies'],
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.packages).toHaveLength(4);
            expect(result.value.warnings).toEqual([]);
        }
    });

    it('discovers all 4 packages in the sample monorepo', async () => {
        const result = await discoverPackages(MONOREPO_DIR, {
            patterns: ['packages/*'],
            protocols: ['workspace:'],
            ignore: ['**/node_modules/**', '**/lib/**', '**/dist/**'],
            dependencyTypes: ['dependencies'],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            const { packages, warnings } = result.value;

            // Should find all 4 fixture packages
            expect(packages).toHaveLength(4);
            expect(warnings).toHaveLength(0);

            // Verify package names were parsed
            const names = packages.map(p => p.name).sort();
            expect(names).toEqual([
                '@sample/app-ui',
                '@sample/bad-pkg',
                '@sample/core-lib',
                '@sample/infra',
            ]);
        }
    });

    it('extracts layers correctly from discovered packages', async () => {
        const result = await discoverPackages(MONOREPO_DIR, {
            patterns: ['packages/*'],
            protocols: ['workspace:'],
            ignore: ['**/node_modules/**', '**/lib/**', '**/dist/**'],
            dependencyTypes: ['dependencies'],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            const { packages } = result.value;
            const byName = Object.fromEntries(packages.map(p => [p.name, p]));

            expect(byName['@sample/app-ui'].layer).toBe('ui');
            expect(byName['@sample/core-lib'].layer).toBe('core');
            expect(byName['@sample/infra'].layer).toBe('infra');
            expect(byName['@sample/bad-pkg'].layer).toBe('ui');
        }
    });

    it('extracts workspace dependencies correctly', async () => {
        const result = await discoverPackages(MONOREPO_DIR, {
            patterns: ['packages/*'],
            protocols: ['workspace:'],
            ignore: ['**/node_modules/**', '**/lib/**', '**/dist/**'],
            dependencyTypes: ['dependencies'],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            const { packages } = result.value;
            const byName = Object.fromEntries(packages.map(p => [p.name, p]));

            // app-ui depends on core-lib
            expect(byName['@sample/app-ui'].dependencies).toContain('@sample/core-lib');
            // core-lib depends on infra
            expect(byName['@sample/core-lib'].dependencies).toContain('@sample/infra');
            // infra has no workspace deps
            expect(byName['@sample/infra'].dependencies).toHaveLength(0);
            // bad-pkg depends on infra (the violation scenario)
            expect(byName['@sample/bad-pkg'].dependencies).toContain('@sample/infra');
        }
    });

    it('returns empty packages when pattern matches nothing', async () => {
        const result = await discoverPackages(MONOREPO_DIR, {
            patterns: ['nonexistent/*'],
            protocols: ['workspace:'],
            ignore: ['**/node_modules/**', '**/lib/**', '**/dist/**'],
            dependencyTypes: ['dependencies'],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.packages).toHaveLength(0);
        }
    });

    it('parses package.json files that start with a UTF-8 byte-order mark', async () => {
        const root = await mkdtemp(join(tmpdir(), 'stratify-bom-'));
        try {
            await mkdir(join(root, 'packages', 'a'), { recursive: true });
            await writeFile(
                join(root, 'packages', 'a', 'package.json'),
                '\uFEFF{"name":"a","layer":"core","dependencies":{"b":"workspace:*"}}',
                'utf-8'
            );

            const result = await discoverPackages(root, {
                patterns: ['packages/*'],
                protocols: ['workspace:'],
                ignore: [],
                dependencyTypes: ['dependencies'],
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.value.warnings).toEqual([]);
                expect(result.value.packages).toMatchObject([
                    { name: 'a', layer: 'core', dependencies: ['b'] },
                ]);
            }
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
