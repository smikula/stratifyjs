import type {
    LayerConfig,
    StratifyConfig,
    EnforcementConfig,
    WorkspaceConfig,
} from '../types/types.js';
import { DEFAULT_PATTERNS, DEFAULT_PROTOCOLS, DEFAULT_IGNORE } from './constants.js';

export const DEFAULT_ENFORCEMENT: EnforcementConfig = {
    mode: 'warn',
};

export const DEFAULT_WORKSPACES: WorkspaceConfig = {
    patterns: DEFAULT_PATTERNS,
    protocols: DEFAULT_PROTOCOLS,
    ignore: DEFAULT_IGNORE,
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
