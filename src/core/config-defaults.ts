import type {
    LayerConfig,
    ResolvedConfig,
    EnforcementConfig,
    WorkspaceConfig,
} from '../types/types.js';

export const DEFAULT_ENFORCEMENT: EnforcementConfig = {
    mode: 'warn',
};

export const DEFAULT_WORKSPACES: WorkspaceConfig = {
    patterns: ['packages/**/*'],
};

/**
 * Apply defaults to a validated LayerConfig, producing a fully resolved config.
 */
export function applyDefaults(config: LayerConfig): ResolvedConfig {
    return {
        layers: config.layers,
        enforcement: {
            ...DEFAULT_ENFORCEMENT,
            ...config.enforcement,
        },
        workspaces: {
            ...DEFAULT_WORKSPACES,
            ...config.workspaces,
        },
    };
}
