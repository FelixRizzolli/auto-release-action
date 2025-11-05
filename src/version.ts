import { FileService, IFileService } from './services/file.service';

// Default file service instance
const defaultFileService = new FileService();

/**
 * Parse package.json content to extract version (pure function)
 * @param content - The package.json file content as string
 * @returns The version string, or empty string if not found
 * @throws Error if JSON is invalid
 */
export function parsePackageJson(content: string): string {
    const packageJson = JSON.parse(content);
    return packageJson.version || '';
}

/**
 * Get the current version from package.json file
 * @param packageJsonPath - Path to package.json
 * @param fileService - Optional file service for dependency injection
 * @returns The version string
 * @throws Error if file cannot be read or parsed
 */
export async function getCurrentVersion(
    packageJsonPath: string,
    fileService: IFileService = defaultFileService
): Promise<string> {
    const content = fileService.readFile(packageJsonPath);
    return parsePackageJson(content);
}

/**
 * Extract version from tag name (remove prefix)
 * @param tag - Tag name (e.g., "v1.2.3")
 * @param tagPrefix - Prefix to remove (e.g., "v")
 * @returns Version without prefix (e.g., "1.2.3")
 */
export function extractVersionFromTag(tag: string, tagPrefix: string): string {
    if (tag.startsWith(tagPrefix)) {
        return tag.substring(tagPrefix.length);
    }
    return tag;
}

