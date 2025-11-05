import * as core from '@actions/core';
import { exec } from '@actions/exec';

/**
 * Interface for git operations
 */
export interface IGitService {
    getTags(tagPrefix: string): Promise<string[]>;
    tagExists(tagName: string): Promise<boolean>;
    createTag(tagName: string, message: string): Promise<void>;
    getFileFromTag(tagName: string, filePath: string): Promise<string>;
}

/**
 * Service for handling git operations
 */
export class GitService implements IGitService {
    /**
     * Get all tags matching a prefix, sorted by version (descending)
     * @param tagPrefix - Prefix to filter tags (e.g., "v")
     * @returns Array of tag names, sorted by version
     */
    async getTags(tagPrefix: string): Promise<string[]> {
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
            return [];
        }

        return this.parseGitTags(output);
    }

    /**
     * Check if a specific tag exists
     * @param tagName - Tag name to check
     * @returns True if tag exists, false otherwise
     */
    async tagExists(tagName: string): Promise<boolean> {
        const exitCode = await exec('git', ['rev-parse', tagName], {
            listeners: {
                stdout: () => {}, // Ignore output
            },
            ignoreReturnCode: true,
            silent: true,
        });

        return exitCode === 0;
    }

    /**
     * Create an annotated git tag and push it to origin
     * @param tagName - Name of the tag to create
     * @param message - Tag annotation message
     */
    async createTag(tagName: string, message: string): Promise<void> {
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
     * Get file content from a specific tag
     * @param tagName - Tag name to retrieve file from
     * @param filePath - Path to file in the repository
     * @returns File content as string
     * @throws Error if file cannot be retrieved
     */
    async getFileFromTag(tagName: string, filePath: string): Promise<string> {
        let output = '';
        let error = '';

        const exitCode = await exec('git', ['show', `${tagName}:${filePath}`], {
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
                `Failed to get ${filePath} from tag ${tagName}: ${error}`,
                { cause: error }
            );
        }

        return output;
    }

    /**
     * Parse git tag output to extract tags (pure function)
     * @param output - Raw output from git tag command
     * @returns Array of tag names, or empty array if none found
     */
    private parseGitTags(output: string): string[] {
        return output
            .trim()
            .split('\n')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
    }
}
