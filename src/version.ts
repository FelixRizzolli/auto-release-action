import * as fs from 'fs';
import * as core from '@actions/core';
import { exec } from '@actions/exec';

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
 * Parse git tag output to extract tags (pure function)
 * @param output - Raw output from git tag command
 * @returns Array of tag names, or empty array if none found
 */
export function parseGitTags(output: string): string[] {
    return output
        .trim()
        .split('\n')
        .filter((tag) => tag.length > 0);
}

/**
 * Get the latest version tag from git
 */
export async function getLatestVersionTag(tagPrefix: string): Promise<string | null> {
    let output = '';
    let error = '';

    const exitCode = await exec('git', ['tag', '-l', `${tagPrefix}*`, '--sort=-v:refname'], {
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            },
            stderr: (data: Buffer) => {
                error += data.toString();
            },
        },
        ignoreReturnCode: true,
        silent: true,
    });

    if (exitCode !== 0) {
        core.warning(`git tag command failed: ${error}`);
        return null;
    }

    const tags = parseGitTags(output);
    return tags.length > 0 ? tags[0] : null;
}

/**
 * Check if a specific tag exists
 */
export async function tagExists(tagName: string): Promise<boolean> {
    let output = '';

    const exitCode = await exec('git', ['rev-parse', tagName], {
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            },
        },
        ignoreReturnCode: true,
        silent: true,
    });

    return exitCode === 0;
}

/**
 * Extract version from tag name (remove prefix)
 */
export function extractVersionFromTag(tag: string, tagPrefix: string): string {
    if (tag.startsWith(tagPrefix)) {
        return tag.substring(tagPrefix.length);
    }
    return tag;
}

/**
 * Create a git tag
 */
export async function createGitTag(tagName: string, message: string): Promise<void> {
    // Configure git user
    await exec('git', ['config', 'user.name', 'github-actions[bot]']);
    await exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);

    // Create annotated tag
    await exec('git', ['tag', '-a', tagName, '-m', message]);

    // Push tag
    await exec('git', ['push', 'origin', tagName]);

    core.info(`Created and pushed tag: ${tagName}`);
}

/**
 * Get package.json content from a specific tag
 */
export async function getPackageFromTag(tagName: string, packageJsonPath: string): Promise<string> {
    let output = '';
    let error = '';

    const exitCode = await exec('git', ['show', `${tagName}:${packageJsonPath}`], {
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            },
            stderr: (data: Buffer) => {
                error += data.toString();
            },
        },
        ignoreReturnCode: true,
        silent: true,
    });

    if (exitCode !== 0) {
        throw new Error(
            `Failed to get package.json from tag ${tagName}: ${error}`,
            { cause: error }
        );
    }

    return output;
}
