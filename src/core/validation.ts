import type { Package, StratifyResolvedConfig, Violation } from '../types/types.js';
import {
    hasRequiredLayer,
    isKnownLayer,
    isDependencyAllowed,
    isPackageAllowedInLayer,
} from './rules.js';

/**
 * Validate all packages against layer configuration.
 *
 * @param packages - Discovered packages to validate.
 * @param config - Fully resolved stratify configuration.
 * @param allowedPackagesByLayer - Map from layer name to the set of allowed package names.
 *   If a layer is not in this map, it has no membership restrictions.
 */
export function validatePackages(
    packages: Package[],
    config: StratifyResolvedConfig,
    allowedPackagesByLayer: Map<string, Set<string>> = new Map()
): Violation[] {
    const violations: Violation[] = [];
    const packageMap = new Map(packages.map(pkg => [pkg.name, pkg]));
    const validLayers = Object.keys(config.layers).join(', ');

    for (const pkg of packages) {
        // Rule 1: Check if package has a layer field
        if (!hasRequiredLayer(pkg)) {
            violations.push({
                type: 'missing-layer',
                package: pkg.name,
                message: `Package "${pkg.name}" is missing the required "layer" field in package.json`,
                detailedMessage:
                    `🏷️  Missing Layer: "${pkg.name}"\n` +
                    `   Add a "layer" field to ${pkg.path} to assign this package to an architectural layer.\n` +
                    `   Valid layers: ${validLayers}`,
            });
            continue; // Cannot validate further without layer
        }

        const layer = pkg.layer!;

        // Rule 2: Layer must be defined in config
        if (!isKnownLayer(layer, config.layers)) {
            violations.push({
                type: 'unknown-layer',
                package: pkg.name,
                message: `Package "${pkg.name}" has unknown layer "${layer}". Valid layers: ${validLayers}`,
                detailedMessage:
                    `❓ Unknown Layer: "${pkg.name}" declares layer "${layer}", which is not defined in the config.\n` +
                    `   Valid layers: ${validLayers}\n` +
                    `   Fix the "layer" field in ${pkg.path}.`,
            });
            continue;
        }

        // Rule 3: Package must be allowed in its declared layer (membership control)
        const allowedSet = allowedPackagesByLayer.get(layer);
        if (!isPackageAllowedInLayer(pkg.name, allowedSet)) {
            const layerDef = config.layers[layer];
            const source = layerDef.allowedPackagesFile ?? 'allowedPackages in config';
            violations.push({
                type: 'unauthorized-layer-member',
                package: pkg.name,
                message: `Package "${pkg.name}" is not permitted in layer "${layer}"`,
                detailedMessage:
                    `🔒 Unauthorized Layer Member: "${pkg.name}" declares layer "${layer}", but is not in the allowed list.\n` +
                    `   Add "${pkg.name}" to ${source}, or assign a different layer in ${pkg.path}.`,
                details: {
                    fromLayer: layer,
                    allowedPackagesSource: layerDef.allowedPackagesFile ?? 'inline',
                },
            });
            continue; // Skip dependency checks for unauthorized packages
        }

        // Rule 4: Each dependency must target an allowed layer
        const layerDef = config.layers[layer];
        const allowedDeps = new Set(layerDef.allowedDependencies);
        for (const depName of pkg.dependencies) {
            const depPkg = packageMap.get(depName);
            if (!depPkg || !depPkg.layer) {
                continue; // Skip dependencies that are not discovered or have no layer
            }

            if (!isDependencyAllowed(layer, depPkg.layer, allowedDeps)) {
                const allowed =
                    layerDef.allowedDependencies.length > 0
                        ? layerDef.allowedDependencies.join(', ')
                        : '(none)';
                violations.push({
                    type: 'invalid-dependency',
                    package: pkg.name,
                    message: `Layer violation: "${pkg.name}" (${layer}) cannot depend on "${depPkg.name}" (${depPkg.layer})`,
                    detailedMessage:
                        `🚫 Invalid Dependency: "${pkg.name}" (layer: ${layer}) → "${depPkg.name}" (layer: ${depPkg.layer})\n` +
                        `   The "${layer}" layer is only allowed to depend on: ${allowed}\n` +
                        `   Remove the dependency or adjust layer rules in the config.`,
                    details: {
                        fromLayer: layer,
                        toPackage: depPkg.name,
                        toLayer: depPkg.layer,
                        allowedLayers: layerDef.allowedDependencies,
                    },
                });
            }
        }
    }

    return violations;
}
