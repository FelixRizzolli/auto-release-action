import { replaceTabs, trimEmptyEdges } from '../utils';

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

    // Trim leading and trailing blank lines using helper
    changelogContent = trimEmptyEdges(changelogContent);

    // Convert all tabs to spaces (4 spaces per tab) using helper
    const result = changelogContent.map((line) => replaceTabs(line, 4)).join('\n');

    return result;
}
