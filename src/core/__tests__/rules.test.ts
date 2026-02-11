import { hasRequiredLayer, isKnownLayer, isDependencyAllowed } from '../rules.js';
import type { Package, LayerMap } from '../../types/types.js';

describe('hasRequiredLayer', () => {
    it('returns true when layer is a non-empty string', () => {
        const pkg: Package = { name: 'a', layer: 'core', dependencies: [], path: '' };
        expect(hasRequiredLayer(pkg)).toBe(true);
    });

    it('returns false when layer is undefined', () => {
        const pkg: Package = { name: 'a', layer: undefined, dependencies: [], path: '' };
        expect(hasRequiredLayer(pkg)).toBe(false);
    });

    it('returns false when layer is empty string', () => {
        const pkg: Package = { name: 'a', layer: '', dependencies: [], path: '' };
        expect(hasRequiredLayer(pkg)).toBe(false);
    });
});

describe('isKnownLayer', () => {
    const layers: LayerMap = {
        ui: { allowedDependencies: ['core'] },
        core: { allowedDependencies: [] },
    };

    it('returns true for a known layer', () => {
        expect(isKnownLayer('ui', layers)).toBe(true);
    });

    it('returns false for an unknown layer', () => {
        expect(isKnownLayer('infra', layers)).toBe(false);
    });
});

describe('isDependencyAllowed', () => {
    it('returns true when target layer is in allowedDependencies', () => {
        expect(isDependencyAllowed('ui', 'core', ['core', 'shared'])).toBe(true);
    });

    it('returns false when target layer is not in allowedDependencies', () => {
        expect(isDependencyAllowed('ui', 'infra', ['core'])).toBe(false);
    });

    it('returns true when allowedDependencies contains wildcard "*"', () => {
        // The wildcard means "this layer can depend on any other layer"
        expect(isDependencyAllowed('ui', 'anything', ['*'])).toBe(true);
    });
});
