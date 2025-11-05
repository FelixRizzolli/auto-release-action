import { FileService, IFileService } from './services/file.service';
import { parsePackageJson, extractVersionFromTag } from './parsers/package-json.parser';

// Re-export parser functions for backward compatibility
export { parsePackageJson, extractVersionFromTag };

// Default file service instance
const defaultFileService = new FileService();

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


