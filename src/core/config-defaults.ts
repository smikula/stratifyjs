import type {
    LayerConfig,
    StratifyConfig,
    EnforcementConfig,
    WorkspaceConfig,
} from '../types/types.js';
import { DEFAULT_PROTOCOLS } from './constants.js';

export const DEFAULT_ENFORCEMENT: EnforcementConfig = {
    mode: 'warn',
};

export const DEFAULT_WORKSPACES: WorkspaceConfig = {
    patterns: ['packages/**/*'],
    protocols: DEFAULT_PROTOCOLS,
};

/**
 * Apply defaults to a validated LayerConfig, producing a fully resolved config.
 */
export function applyDefaults(config: LayerConfig): StratifyConfig {
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
