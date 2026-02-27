// @ts-check
/** @type {import('beachball').BeachballConfig} */
module.exports = {
    // The branch to compare against when detecting changes.
    // Beachball diffs your feature branch against this branch to determine
    // which files changed and whether a change file is needed.
    branch: 'origin/master',

    // Message shown to developers when `beachball check` fails in CI.
    // This guides them to the correct command to fix the issue.
    changehint: 'Run "yarn change" to create a change file.',

    // Generate a Markdown changelog (CHANGELOG.md) when bumping.
    // Other options: true (generates both .md and .json) or 'json' (only JSON).
    generateChangelog: 'md',

    // Do NOT publish to npm — we keep the existing manual release flow.
    publish: false,

    // Do NOT push git changes — the version-bump workflow handles the push.
    push: false,

    // Do NOT create git tags — we create them via GitHub Releases.
    gitTags: false,

    // Files matching these patterns will NOT trigger a "missing change file"
    // error. These are files that don't affect the published package.
    ignorePatterns: [
        '.github/**', // CI/CD workflows
        'src/__tests__/**', // Test files
        '*.md', // Documentation
        'jest.config.mjs', // Test configuration
        'tsconfig.json', // TypeScript configuration
        '.gitignore', // Git ignore rules
        '.prettierrc*', // Formatter configuration
        '*.config.*', // Other config files (including this one)
    ],
};
