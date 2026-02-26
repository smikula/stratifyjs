import {
    hasRequiredLayer,
    isKnownLayer,
    isDependencyAllowed,
    isPackageAllowedInLayer,
} from '../rules.js';
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
        expect(isDependencyAllowed('ui', 'core', new Set(['core', 'shared']))).toBe(true);
    });

    it('returns false when target layer is not in allowedDependencies', () => {
        expect(isDependencyAllowed('ui', 'infra', new Set(['core']))).toBe(false);
    });

    it('returns true when allowedDependencies contains wildcard "*"', () => {
        expect(isDependencyAllowed('ui', 'anything', new Set(['*']))).toBe(true);
    });
});

describe('isPackageAllowedInLayer', () => {
    it('should return true when no allowlist is defined (unrestricted layer)', () => {
        expect(isPackageAllowedInLayer('@app/anything', undefined)).toBe(true);
    });

    it('should return true when the package is in the allowed set', () => {
        const allowed = new Set(['@app/auth', '@app/cart']);
        expect(isPackageAllowedInLayer('@app/auth', allowed)).toBe(true);
    });

    it('should return false when the package is NOT in the allowed set', () => {
        const allowed = new Set(['@app/auth', '@app/cart']);
        expect(isPackageAllowedInLayer('@app/new-thing', allowed)).toBe(false);
    });

    it('should return false for an empty allowed set', () => {
        const allowed = new Set<string>();
        expect(isPackageAllowedInLayer('@app/any', allowed)).toBe(false);
    });
});
