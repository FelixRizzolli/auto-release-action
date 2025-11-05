import * as fs from 'fs';
import * as core from '@actions/core';

/**
 * Parse changelog content for a specific version (pure function)
 * @param content - The full changelog file content
 * @param version - The version to extract (e.g., "1.0.0" or "v1.0.0")
 * @returns The parsed changelog section for the version, or empty string if not found
 */
export function parseChangelogContent(content: string, version: string): string {
    const lines = content.split('\n');

    // Normalize version (remove leading v if present)
    const versionClean = version.replace(/^v/, '');

    // Escape dots for regex
    const versionEscaped = versionClean.replace(/\./g, '\\.');

    // Find the header line for the requested version
    // Matches formats like: ## [0.5.0] - DATE, ## [0.6.0], ## 0.6.0 - DATE
    const headerRegex = new RegExp(`^## .*\\[?${versionEscaped}\\]?`);
    const startLineIndex = lines.findIndex((line) => headerRegex.test(line));

    if (startLineIndex === -1) {
        return '';
    }

    // Find the next header (next version section)
    const nextHeaderIndex = lines.findIndex((line, idx) => {
        return idx > startLineIndex && line.startsWith('## ');
    });

    // Extract content between this version and next version (or end of file)
    let changelogContent: string[];
    if (nextHeaderIndex === -1) {
        changelogContent = lines.slice(startLineIndex + 1);
    } else {
        changelogContent = lines.slice(startLineIndex + 1, nextHeaderIndex);
    }

    // Trim leading and trailing blank lines
    while (changelogContent.length > 0 && !changelogContent[0].trim()) {
        changelogContent.shift();
    }
    while (changelogContent.length > 0 && !changelogContent[changelogContent.length - 1].trim()) {
        changelogContent.pop();
    }

    // Convert all tabs to spaces (4 spaces per tab)
    const result = changelogContent.map((line) => line.replace(/\t/g, '    ')).join('\n');

    return result;
}

/**
 * Extract changelog content for a specific version from a file
 * @param changelogPath - Path to the CHANGELOG.md file
 * @param version - The version to extract
 * @returns The parsed changelog section, or empty string if not found
 */
export function extractChangelog(changelogPath: string, version: string): string {
    if (!fs.existsSync(changelogPath)) {
        core.warning(`CHANGELOG.md not found at ${changelogPath}`);
        return '';
    }

    const content = fs.readFileSync(changelogPath, 'utf8');
    const result = parseChangelogContent(content, version);

    if (!result) {
        const versionClean = version.replace(/^v/, '');
        core.warning(`Version ${versionClean} not found in ${changelogPath}`);
    }

    return result;
}
