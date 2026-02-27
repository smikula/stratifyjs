#!/usr/bin/env node
import { program } from 'commander';
import { createRequire } from 'module';
import { parseCliOptions } from './options.js';
import { handleValidateCommand } from './command-handler.js';
import { DEFAULT_CONFIG_FILENAME } from '../core/constants.js';
import { DEFAULT_OUTPUT_FORMAT } from './cli-defaults.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

program
    .name('stratifyjs')
    .description('Enforce package layering rules in monorepos')
    .version(version)
    .option('-c, --config <path>', 'Path to layer config file', DEFAULT_CONFIG_FILENAME)
    .option('-r, --root <path>', 'Workspace root directory', process.cwd())
    .option('-m, --mode <mode>', 'Override enforcement mode (error|warn|off)')
    .option('--format <type>', 'Output format (console|json)', DEFAULT_OUTPUT_FORMAT)
    .parse(process.argv);

const options = parseCliOptions(program.opts());

handleValidateCommand(options)
    .then(code => process.exit(code))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
