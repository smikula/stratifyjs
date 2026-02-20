#!/usr/bin/env node
import { program } from 'commander';
import { createRequire } from 'module';
import { parseCliOptions } from './options.js';
import { handleValidateCommand } from './command-handler.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

program
    .name('stratifyjs')
    .description('Enforce package layering rules in monorepos')
    .version(version)
    .option('-c, --config <path>', 'Path to layer config file', 'stratify.config.json')
    .option('-r, --root <path>', 'Workspace root directory', process.cwd())
    .option('-m, --mode <mode>', 'Override enforcement mode (error|warn|off)')
    .option('--format <type>', 'Output format (console|json)', 'console')
    .parse(process.argv);

const options = parseCliOptions(program.opts());

handleValidateCommand(options)
    .then(code => process.exit(code))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
