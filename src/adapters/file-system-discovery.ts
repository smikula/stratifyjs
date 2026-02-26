import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { glob } from 'glob';
import type { Package, WorkspaceConfig } from '../types/types.js';
import type { DiscoveryError } from '../core/errors.js';
import type { Result } from '../core/result.js';
import { ok, err } from '../core/result.js';
import { parsePackageJson } from '../core/package-parser.js';

const DEFAULT_IGNORE = ['**/node_modules/**', '**/lib/**', '**/dist/**'];

type GlobResult = { ok: true; paths: string[] } | { ok: false; pattern: string; error: unknown };

/**
 * Non-fatal warning produced during discovery.
 */
export interface DiscoveryWarning {
    path: string;
    message: string;
}

/**
 * Successful discovery result containing packages and any non-fatal warnings.
 */
export interface DiscoveryResult {
    packages: Package[];
    warnings: DiscoveryWarning[];
}

/**
 * Discover all packages in the workspace by globbing for package.json files.
 * I/O adapter — reads from the file system using glob + readFile.
 */
export async function discoverPackages(
    root: string,
    config: WorkspaceConfig,
    ignore: string[] = DEFAULT_IGNORE
): Promise<Result<DiscoveryResult, DiscoveryError>> {
    const globResults = await Promise.all(
        config.patterns.map(async (pattern): Promise<GlobResult> => {
            try {
                const paths = await glob(`${pattern}/package.json`, {
                    cwd: root,
                    ignore,
                });
                return { ok: true, paths };
            } catch (error) {
                return { ok: false, pattern, error };
            }
        })
    );

    const allPaths: string[] = [];
    for (const result of globResults) {
        if (!result.ok) {
            return err({
                type: 'glob-failed',
                message:
                    result.error instanceof Error ? result.error.message : String(result.error),
                pattern: result.pattern,
                cause: result.error,
            });
        }
        allPaths.push(...result.paths);
    }

    const uniquePaths = [...new Set(allPaths)];
    const settledPackages = await Promise.allSettled(
        uniquePaths.map(async relativePath => {
            const fullPath = resolve(root, relativePath);
            const content = await readFile(fullPath, 'utf-8');
            const parsed = JSON.parse(content) as unknown;
            return { relativePath, fullPath, parsed };
        })
    );

    const packages: Package[] = [];
    const warnings: DiscoveryWarning[] = [];

    for (let i = 0; i < settledPackages.length; i++) {
        const entry = settledPackages[i];
        const relativePath = uniquePaths[i];

        if (entry.status === 'rejected') {
            const fullPath = resolve(root, relativePath);
            const reason = entry.reason;
            warnings.push({
                path: fullPath,
                message: reason instanceof Error ? reason.message : String(reason),
            });
            continue;
        }

        const { parsed, fullPath } = entry.value;
        const result = parsePackageJson(parsed, relativePath);

        if (result.success) {
            packages.push(result.value);
        } else {
            warnings.push({ path: fullPath, message: result.error.message });
        }
    }

    return ok({ packages, warnings });
}
