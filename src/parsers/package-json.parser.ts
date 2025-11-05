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
 * Extract version from tag name by removing prefix (pure function)
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
