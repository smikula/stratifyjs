import type {
    LayerConfig,
    LayerDefinition,
    LayerMap,
    EnforcementConfig,
    WorkspaceConfig,
} from '../types/types.js';
import type { ConfigError } from './errors.js';
import type { Result } from './result.js';
import { ok, err } from './result.js';

/**
 * Validate that a raw parsed object conforms to the LayerConfig schema.
 */
export function validateConfigSchema(raw: unknown): Result<LayerConfig, ConfigError> {
    if (typeof raw !== 'object' || raw === null) {
        return err({ type: 'config-validation-error', message: 'Config must be a JSON object' });
    }

    const obj = raw as Record<string, unknown>;

    // Validate 'layers' field
    if (typeof obj.layers !== 'object' || obj.layers === null) {
        return err({
            type: 'config-validation-error',
            message: 'Config must have a "layers" object',
        });
    }

    // Validate each layer definition
    const layers = obj.layers as Record<string, unknown>;
    const errors: string[] = [];

    for (const [layerName, layerDef] of Object.entries(layers)) {
        const result = validateLayerDefinition(layerName, layerDef);
        if (!result.success) {
            errors.push(result.error.message);
        }
    }

    if (errors.length > 0) {
        return err({
            type: 'config-validation-error',
            message: 'Invalid layer definitions',
            details: errors,
        });
    }

    // Validate optional 'enforcement' field
    if (obj.enforcement !== undefined) {
        if (typeof obj.enforcement !== 'object' || obj.enforcement === null) {
            return err({
                type: 'config-validation-error',
                message: '"enforcement" field must be an object if defined',
            });
        }

        const enforcement = obj.enforcement as Record<string, unknown>;
        if (
            enforcement.mode !== undefined &&
            (typeof enforcement.mode !== 'string' ||
                !['error', 'warn', 'off'].includes(enforcement.mode))
        ) {
            return err({
                type: 'config-validation-error',
                message: `Invalid enforcement mode: "${enforcement.mode}". Must be "error", "warn", or "off"`,
            });
        }
    }

    // Validate optional 'workspaces'
    if (obj.workspaces !== undefined) {
        if (typeof obj.workspaces !== 'object' || obj.workspaces === null) {
            return err({
                type: 'config-validation-error',
                message: '"workspaces" must be an object',
            });
        }
        const workspaces = obj.workspaces as Record<string, unknown>;
        if (
            workspaces.patterns !== undefined &&
            (!Array.isArray(workspaces.patterns) ||
                !workspaces.patterns.every((p: unknown) => typeof p === 'string'))
        ) {
            return err({
                type: 'config-validation-error',
                message: '"workspaces.patterns" must be an array of strings',
            });
        }
    }

    return ok({
        layers: obj.layers as LayerMap,
        enforcement: obj.enforcement as Partial<EnforcementConfig> | undefined,
        workspaces: obj.workspaces as Partial<WorkspaceConfig> | undefined,
    });
}

/**
 * Validate a single layer definition.
 */
export function validateLayerDefinition(
    name: string,
    raw: unknown
): Result<LayerDefinition, ConfigError> {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return err({
            type: 'config-validation-error',
            message: `Layer "${name}" must be an object`,
        });
    }

    const def = raw as Record<string, unknown>;

    if (!Array.isArray(def.allowedDependencies)) {
        return err({
            type: 'config-validation-error',
            message: `Layer "${name}" must have an "allowedDependencies" array`,
        });
    }

    if (!def.allowedDependencies.every((d: unknown) => typeof d === 'string')) {
        return err({
            type: 'config-validation-error',
            message: `Layer "${name}" allowedDependencies must contain only strings`,
        });
    }

    return ok({
        description: typeof def.description === 'string' ? def.description : undefined,
        allowedDependencies: def.allowedDependencies as string[],
    });
}
