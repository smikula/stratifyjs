import { applyDefaults, DEFAULT_ENFORCEMENT, DEFAULT_WORKSPACES } from '../config-defaults.js';
import type { LayerConfig } from '../../types/types.js';

describe('applyDefaults', () => {
    // ── Minimal config (all defaults applied) ──────────────────────────
    it('applies default enforcement and workspaces when not specified', () => {
        const config: LayerConfig = {
            layers: {
                core: { allowedDependencies: [] },
            },
            // enforcement and workspaces are intentionally omitted
        };

        const resolved = applyDefaults(config);

        // The layers themselves pass through unchanged
        expect(resolved.layers).toEqual(config.layers);
        // Enforcement mode defaults to 'warn'
        expect(resolved.enforcement).toEqual(DEFAULT_ENFORCEMENT);
        expect(resolved.enforcement.mode).toBe('warn');
        // Workspaces defaults to ['packages/**/*']
        expect(resolved.workspaces).toEqual(DEFAULT_WORKSPACES);
        expect(resolved.workspaces.patterns).toEqual(['packages/**/*']);
    });

    // ── Override enforcement only ──────────────────────────────────────
    it('uses provided enforcement mode', () => {
        const config: LayerConfig = {
            layers: { core: { allowedDependencies: [] } },
            enforcement: { mode: 'error' },
        };

        const resolved = applyDefaults(config);

        expect(resolved.enforcement.mode).toBe('error');
        // workspaces should still get defaults
        expect(resolved.workspaces.patterns).toEqual(['packages/**/*']);
    });

    // ── Override workspaces only ───────────────────────────────────────
    it('uses provided workspaces patterns', () => {
        const config: LayerConfig = {
            layers: { core: { allowedDependencies: [] } },
            workspaces: { patterns: ['apps/*', 'libs/*'] },
        };

        const resolved = applyDefaults(config);

        expect(resolved.workspaces.patterns).toEqual(['apps/*', 'libs/*']);
        // enforcement should still get defaults
        expect(resolved.enforcement.mode).toBe('warn');
    });

    // ── Override both ──────────────────────────────────────────────────
    it('uses both overrides when provided', () => {
        const config: LayerConfig = {
            layers: { core: { allowedDependencies: [] } },
            enforcement: { mode: 'off' },
            workspaces: { patterns: ['modules/*'] },
        };

        const resolved = applyDefaults(config);

        expect(resolved.enforcement.mode).toBe('off');
        expect(resolved.workspaces.patterns).toEqual(['modules/*']);
    });
});
