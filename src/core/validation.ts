import type { Package, ResolvedConfig, Violation } from '../types/types.js';
import { hasRequiredLayer, isKnownLayer, isDependencyAllowed } from './rules.js';

/**
 * Validate all packages against layer configuration.
 */
export function validatePackages(packages: Package[], config: ResolvedConfig): Violation[] {
    const violations: Violation[] = [];
    const packageMap = new Map(packages.map(pkg => [pkg.name, pkg]));

    for (const pkg of packages) {
        // Rule 1: Check if package has a layer field
        if (!hasRequiredLayer(pkg)) {
            violations.push({
                type: 'missing-layer',
                package: pkg.name,
                message: `Package "${pkg.name}" is missing the required "layer" field in package.json`,
            });
            continue; // Cannot validate further without layer
        }

        const layer = pkg.layer!;

        // Rule 2: Layer must be defined in config
        if (!isKnownLayer(layer, config.layers)) {
            violations.push({
                type: 'unknown-layer',
                package: pkg.name,
                message: `Package "${
                    pkg.name
                }" has unknown layer "${layer}". Valid layers: ${Object.keys(config.layers).join(
                    ', '
                )}`,
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
                violations.push({
                    type: 'invalid-dependency',
                    package: pkg.name,
                    message: `Layer violation: "${pkg.name}" (${layer}) cannot depend on "${depPkg.name}" (${depPkg.layer})`,
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
