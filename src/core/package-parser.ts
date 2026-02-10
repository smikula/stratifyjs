import type { Package } from '../types/types.js';
import type { DiscoveryError } from './errors.js';
import type { Result } from './result.js';
import { ok, err } from './result.js';

/**
 * Parse a raw package.json object into a Package.
 */
export function parsePackageJson(
    content: unknown,
    relativePath: string
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
        dependencies: extractWorkspaceDependencies(
            pkg.dependencies as Record<string, string> | undefined,
            pkg.devDependencies as Record<string, string> | undefined,
            pkg.peerDependencies as Record<string, string> | undefined
        ),
        path: relativePath,
    });
}

/**
 * Extract workspace: protocol dependencies from deps, devDeps, and peerDeps.
 */
export function extractWorkspaceDependencies(
    dependencies?: Record<string, string>,
    devDependencies?: Record<string, string>,
    peerDependencies?: Record<string, string>
): string[] {
    const allDeps = { ...dependencies, ...devDependencies, ...peerDependencies };
    return Object.entries(allDeps)
        .filter(([_, version]) => typeof version === 'string' && version.startsWith('workspace:'))
        .map(([name, _]) => name);
}
