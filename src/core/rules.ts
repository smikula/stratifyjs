import type { Package, LayerMap } from '../types/types.js';

/**
 * Check whether a package has the required "layer" field.
 */
export function hasRequiredLayer(pkg: Package): boolean {
    return pkg.layer !== undefined && pkg.layer !== '';
}

/**
 * Check whether a layer name is defined in the config.
 */
export function isKnownLayer(layerName: string, layers: LayerMap): boolean {
    return layerName in layers;
}

/**
 * Check whether a dependency from one layer to another is permitted.
 * Wildcard '*' in allowedDependencies permits any target layer.
 */
export function isDependencyAllowed(
    fromLayer: string,
    toLayer: string,
    allowedDependencies: string[]
): boolean {
    return allowedDependencies.includes('*') || allowedDependencies.includes(toLayer);
}
