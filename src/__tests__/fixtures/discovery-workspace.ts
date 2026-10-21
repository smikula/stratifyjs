import { mkdir, mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { StratifyConfig } from '../../types/types.js';

export const discoveryScenarios = [
    'invalid-json',
    'invalid-name',
    'unreadable',
    'duplicate',
    'empty',
] as const;

export type DiscoveryScenario = (typeof discoveryScenarios)[number];

export async function createDiscoveryWorkspace(scenario: DiscoveryScenario) {
    const root = await mkdtemp(join(tmpdir(), 'stratify-discovery-'));
    const config: StratifyConfig = {
        layers: { core: { allowedDependencies: ['core'] } },
        workspaces: { patterns: ['packages/*'] },
        enforcement: { mode: 'error' },
    };
    await writeFile(join(root, 'stratify.config.json'), JSON.stringify(config));
    if (scenario !== 'empty') {
        await mkdir(join(root, 'packages', 'healthy'), { recursive: true });
        await writeFile(
            join(root, 'packages', 'healthy', 'package.json'),
            JSON.stringify({ name: 'healthy', layer: 'core' })
        );
        if (scenario === 'duplicate') {
            for (const directory of ['a', 'b', 'c']) {
                await mkdir(join(root, 'packages', directory), { recursive: true });
                await writeFile(
                    join(root, 'packages', directory, 'package.json'),
                    JSON.stringify({ name: 'duplicate', layer: 'core' })
                );
            }
        } else {
            const path = join(root, 'packages', 'broken', 'package.json');
            await mkdir(join(root, 'packages', 'broken'), { recursive: true });
            if (scenario === 'unreadable') {
                // A directory at the matched manifest path reliably fails readFile on Windows.
                await mkdir(path);
            } else {
                await writeFile(
                    path,
                    scenario === 'invalid-json' ? '{broken' : JSON.stringify({ name: '' })
                );
            }
        }
    }
    return { root, config };
}
