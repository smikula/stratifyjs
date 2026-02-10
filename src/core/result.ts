/**
 * A discriminated union representing either a successful value or an error.
 * Used throughout the library to make error handling explicit and type-safe.
 */
export type Result<T, E> =
    | { readonly success: true; readonly value: T }
    | { readonly success: false; readonly error: E };

/**
 * Create a successful Result containing the given value.
 */
export function ok<T>(value: T): Result<T, never> {
    return { success: true, value };
}

/**
 * Create a failed Result containing the given error.
 */
export function err<E>(error: E): Result<never, E> {
    return { success: false, error };
}

/**
 * Type guard for successful Results.
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
    return result.success;
}

/**
 * Type guard for failed Results.
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
}
