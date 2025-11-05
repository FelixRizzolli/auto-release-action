import * as core from '@actions/core';
import { isBlank } from './utils';
import { FileService, IFileService } from './services/file.service';
import { parseChangelogContent } from './parsers/changelog.parser';

// Re-export parser function for backward compatibility
export { parseChangelogContent };

// Default file service instance
const defaultFileService = new FileService();

/**
 * Extract changelog content for a specific version from a file
 * @param changelogPath - Path to the CHANGELOG.md file
 * @param version - The version to extract
 * @param fileService - Optional file service for dependency injection
 * @returns The parsed changelog section, or empty string if not found
 */
export function extractChangelog(
    changelogPath: string,
    version: string,
    fileService: IFileService = defaultFileService
): string {
    if (!fileService.fileExists(changelogPath)) {
        core.warning(`CHANGELOG.md not found at ${changelogPath}`);
        return '';
    }

    const content = fileService.readFile(changelogPath);
    const result = parseChangelogContent(content, version);

    if (isBlank(result)) {
        const versionClean = version.replace(/^v/, '');
        core.warning(`Version ${versionClean} not found in ${changelogPath}`);
    }

    return result;
}

