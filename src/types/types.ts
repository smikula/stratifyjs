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
 * Map of layer names to their definitions
 */
export type LayerMap = Record<string, LayerDefinition>;

/**
 * Layer definition in the configuration
 */
export interface LayerDefinition {
    /**
     * Optional description of the layer
     */
    description?: string;
    /**
     * List of allowed dependencies (other layers)
     * that packages in this layer can depend on
     */
    allowedDependencies: string[];
    /**
     * Inline list of package names allowed to declare this layer.
     * If set, only these packages may use this layer.
     * Mutually exclusive with allowedPackagesFile.
     */
    allowedPackages?: string[];
    /**
     * Path to a JSON file (relative to workspace root) containing an array of
     * allowed package names. If set, only packages listed in the file may use this layer.
     * Mutually exclusive with allowedPackages.
     */
    allowedPackagesFile?: string;
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
 * Workspace discovery configuration
 */
export interface WorkspaceConfig {
    patterns: string[];
}

/**
 * Enforcement configuration
 */
export interface EnforcementConfig {
    mode: 'error' | 'warn' | 'off';
}

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
        allowedPackagesSource?: string;
    };
}

/**
 * Violation types
 */
export type ViolationType =
    | 'missing-layer'
    | 'unknown-layer'
    | 'invalid-dependency'
    | 'unauthorized-layer-member';

/**
 * Represents a discovered package in the monorepo
 */
export interface Package {
    name: string;
    layer?: string;
    dependencies: string[];
    path: string;
}
