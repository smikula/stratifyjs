import type { Package } from '../types/types.js';
import type { DiscoveryError } from './errors.js';
import type { Result } from './result.js';
import { ok, err } from './result.js';
import { DEFAULT_PROTOCOLS } from './constants.js';

/**
 * Parse a raw package.json object into a Package.
 *
 * @param content      - The raw parsed package.json object
 * @param relativePath - Relative path to the package within the workspace
 * @param protocols    - Version-string prefixes that identify internal dependencies
 */
export function parsePackageJson(
    content: unknown,
    relativePath: string,
    protocols: string[] = DEFAULT_PROTOCOLS
): Result<Package, DiscoveryError> {
    if (typeof content !== 'object' || content === null) {
        return err({
            type: 'package-parse-error',
            message: `Invalid package.json at "${relativePath}": must be a JSON object`,
            path: relativePath,
        });
    }

    const pkg = content as Record<string, unknown>;

    // Validate required fields
    if (typeof pkg.name !== 'string' || pkg.name.trim() === '') {
        return err({
            type: 'package-parse-error',
            message: `Invalid package.json at "${relativePath}": missing or invalid "name" field`,
            path: relativePath,
        });
    }

    return ok({
        name: pkg.name,
        layer: typeof pkg.layer === 'string' ? pkg.layer : undefined,
        dependencies: extractInternalDependencies(
            protocols,
            pkg.dependencies as Record<string, string> | undefined,
            pkg.devDependencies as Record<string, string> | undefined,
            pkg.peerDependencies as Record<string, string> | undefined
        ),
        path: relativePath,
    });
}

/**
 * Extract internal monorepo dependencies whose version string starts
 * with one of the given protocol prefixes.
 *
 * @param protocols        - Prefixes to match (e.g. ["workspace:", "link:"])
 * @param dependencies     - The dependencies field from package.json
 * @param devDependencies  - The devDependencies field from package.json
 * @param peerDependencies - The peerDependencies field from package.json
 */
export function extractInternalDependencies(
    protocols: string[] = DEFAULT_PROTOCOLS,
    dependencies?: Record<string, string>,
    devDependencies?: Record<string, string>,
    peerDependencies?: Record<string, string>
): string[] {
    const allDeps = { ...dependencies, ...devDependencies, ...peerDependencies };
    return Object.entries(allDeps)
        .filter(
            ([_, version]) =>
                typeof version === 'string' &&
                protocols.some(protocol => version.startsWith(protocol))
        )
        .map(([name, _]) => name);
}
