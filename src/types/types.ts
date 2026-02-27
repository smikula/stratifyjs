/**
 * Stratify configuration as written by the user.
 * Only `layers` is required — `workspaces` and `enforcement` are optional.
 * When omitted (or partially provided), defaults are applied internally.
 */
export interface StratifyConfig {
    layers: LayerMap;
    workspaces?: Partial<WorkspaceConfig>;
    enforcement?: Partial<EnforcementConfig>;
}

/**
 * Fully resolved stratify configuration with all defaults applied.
 * Used internally throughout the library after defaults have been merged.
 */
export interface StratifyResolvedConfig {
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
 * Workspace discovery configuration
 */
export interface WorkspaceConfig {
    /**
     * Glob patterns to discover packages in the monorepo. Each pattern is relative
     * to the workspace root and should point to directories containing package.json files.
     */
    patterns: string[];
    /**
     * Version-string prefixes that identify internal (monorepo) dependencies.
     * Each entry is matched via `version.startsWith(prefix)`.
     *
     * Common protocols: "workspace:", "link:", "portal:", "file:"
     *
     * @default ["workspace:"]
     */
    protocols: string[];
    /**
     * Glob patterns to exclude from package discovery.
     * Paths matching any of these patterns are skipped during globbing.
     *
     * @default ["**​/node_modules/**", "**​/lib/**", "**​/dist/**"]
     */
    ignore: string[];
}

/**
 * Valid enforcement mode values.
 */
export type EnforcementMode = 'error' | 'warn' | 'off';

/**
 * Enforcement configuration
 */
export interface EnforcementConfig {
    mode: EnforcementMode;
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

/**
 * Output formats for CLI results.
 */
export type OutputFormat = 'console' | 'json';
