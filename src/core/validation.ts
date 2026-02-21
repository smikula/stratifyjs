import type { Package, StratifyConfig, Violation } from '../types/types.js';
import { hasRequiredLayer, isKnownLayer, isDependencyAllowed } from './rules.js';

/**
 * Validate all packages against layer configuration.
 */
export function validatePackages(packages: Package[], config: StratifyConfig): Violation[] {
    const violations: Violation[] = [];
    const packageMap = new Map(packages.map(pkg => [pkg.name, pkg]));

    for (const pkg of packages) {
        // Rule 1: Check if package has a layer field
        if (!hasRequiredLayer(pkg)) {
            violations.push({
                type: 'missing-layer',
                package: pkg.name,
                message: `Package "${pkg.name}" is missing the required "layer" field in package.json`,
                detailedMessage:
                    `🏷️  Missing Layer: "${pkg.name}"\n` +
                    `   Add a "layer" field to ${pkg.path}/package.json to assign this package to an architectural layer.\n` +
                    `   Valid layers: ${Object.keys(config.layers).join(', ')}`,
            });
            continue; // Cannot validate further without layer
        }

        const layer = pkg.layer!;

        // Rule 2: Layer must be defined in config
        if (!isKnownLayer(layer, config.layers)) {
            const validLayers = Object.keys(config.layers).join(', ');
            violations.push({
                type: 'unknown-layer',
                package: pkg.name,
                message: `Package "${pkg.name}" has unknown layer "${layer}". Valid layers: ${validLayers}`,
                detailedMessage:
                    `❓ Unknown Layer: "${pkg.name}" declares layer "${layer}", which is not defined in the config.\n` +
                    `   Valid layers: ${validLayers}\n` +
                    `   Fix the "layer" field in ${pkg.path}/package.json.`,
            });
            continue;
        }

        // Rule 3: Each dependency must target an allowed layer
        const layerDef = config.layers[layer];
        for (const depName of pkg.dependencies) {
            const depPkg = packageMap.get(depName);
            if (!depPkg || !depPkg.layer) {
                continue; // Skip dependencies that are not discovered or have no layer
            }

            if (!isDependencyAllowed(layer, depPkg.layer, layerDef.allowedDependencies)) {
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
