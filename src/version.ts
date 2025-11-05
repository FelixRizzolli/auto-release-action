import * as fs from 'fs';

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
 * @returns The version string
 * @throws Error if file cannot be read or parsed
 */
export async function getCurrentVersion(packageJsonPath: string): Promise<string> {
    try {
        const content = fs.readFileSync(packageJsonPath, 'utf8');
        return parsePackageJson(content);
    } catch (error: unknown) {
        throw new Error(
            `Failed to read version from ${packageJsonPath}: ${String(error)}`,
            { cause: error }
        );
    }
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

