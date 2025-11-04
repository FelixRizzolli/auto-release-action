import * as fs from 'fs';
import * as core from '@actions/core';

/**
 * Extract changelog content for a specific version
 */
export function extractChangelog(changelogPath: string, version: string): string {
    if (!fs.existsSync(changelogPath)) {
        core.warning(`CHANGELOG.md not found at ${changelogPath}`);
        return '';
    }

    const content = fs.readFileSync(changelogPath, 'utf8');
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
        core.warning(`Version ${versionClean} not found in ${changelogPath}`);
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

    // Convert tabs to spaces (4 spaces per tab)
    const result = changelogContent.map((line) => line.replace(/^\t/g, '    ')).join('\n');

    return result;
}
