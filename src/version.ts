import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import { exec } from '@actions/exec';

/**
 * Get the current version from package.json
 */
export async function getCurrentVersion(packageJsonPath: string): Promise<string> {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version || '';
    } catch (error) {
        throw new Error(`Failed to read version from ${packageJsonPath}: ${error}`);
    }
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

    const tags = output
        .trim()
        .split('\n')
        .filter((tag) => tag.length > 0);
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
        throw new Error(`Failed to get package.json from tag ${tagName}: ${error}`);
    }

    return output;
}
