import pc from 'picocolors';

/**
 * CLI-specific output helpers with colored terminal formatting.
 */

export function logInfo(message: string): void {
    console.log(pc.blue(message));
}

export function logSuccess(message: string): void {
    console.log(pc.green(message));
}

export function logWarning(message: string): void {
    console.log(pc.yellow(message));
}

export function logError(message: string): void {
    console.error(pc.red(message));
}

export function logGray(message: string): void {
    console.log(pc.gray(message));
}

export function logPlain(message: string): void {
    console.log(message);
}
