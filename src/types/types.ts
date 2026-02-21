/**
 * Represents a discovered package in the monorepo
 */
export interface Package {
    name: string;
    layer?: string;
    dependencies: string[];
    path: string;
}

/**
 * Layer definition in the configuration
 */
export interface LayerDefinition {
    description?: string;
    allowedDependencies: string[];
}

/**
 * Map of layer names to their definitions
 */
export type LayerMap = Record<string, LayerDefinition>;

/**
 * Enforcement configuration
 */
export interface EnforcementConfig {
    mode: 'error' | 'warn' | 'off';
}

/**
 * Workspace discovery configuration
 */
export interface WorkspaceConfig {
    patterns: string[];
}

/**
 * Layer configuration file (as written by user)
 */
export interface LayerConfig {
    layers: LayerMap;
    workspaces?: Partial<WorkspaceConfig>;
    enforcement?: Partial<EnforcementConfig>;
}

/**
 * Fully resolved stratify configuration with all defaults applied.
 * This is the public config type — passed via options.config and
 * used throughout the library.
 */
export interface StratifyConfig {
    layers: LayerMap;
    workspaces: WorkspaceConfig;
    enforcement: EnforcementConfig;
}

/**
 * Violation types
 */
export type ViolationType = 'missing-layer' | 'unknown-layer' | 'invalid-dependency';

/**
 * A single validation violation
 */
export interface Violation {
    type: ViolationType;
    package: string;
    message: string;
    detailedMessage: string;
    details?: {
        fromLayer?: string;
        toPackage?: string;
        toLayer?: string;
        allowedLayers?: string[];
    };
}
