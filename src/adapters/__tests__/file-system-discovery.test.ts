import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { discoverPackages } from '../file-system-discovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MONOREPO_DIR = resolve(__dirname, '..', '..', '__tests__', 'fixtures', 'sample-monorepo');

describe('discoverPackages', () => {
    it('discovers all 4 packages in the sample monorepo', async () => {
        const result = await discoverPackages(MONOREPO_DIR, { patterns: ['packages/*'] });

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
        const result = await discoverPackages(MONOREPO_DIR, { patterns: ['packages/*'] });

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
        const result = await discoverPackages(MONOREPO_DIR, { patterns: ['packages/*'] });

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
        const result = await discoverPackages(MONOREPO_DIR, { patterns: ['nonexistent/*'] });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.packages).toHaveLength(0);
        }
    });
});
