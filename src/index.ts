import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import { getCurrentVersion, getLatestVersionTag, tagExists, extractVersionFromTag, createGitTag } from './version';
import { extractChangelog } from './changelog';
import { buildTagName, isBlank } from './utils';

/**
 * Configuration for the release action
 */
export interface ReleaseConfig {
    githubToken: string;
    packageJsonPath: string;
    changelogPath: string;
    tagPrefix: string;
    createDraft: boolean;
    createPrerelease: boolean;
}

/**
 * Result of determining whether to create a release (pure business logic)
 */
interface ReleaseDecision {
    versionChanged: boolean;
    shouldCreateRelease: boolean;
    newTagName: string;
    currentVersion: string;
    latestVersion?: string;
}

/**
 * Determine if a release should be created based on version comparison (pure function)
 * @param currentVersion - Current version from package.json
 * @param latestTag - Latest git tag (or null if none exists)
 * @param tagPrefix - Prefix for tags (e.g., "v")
 * @param tagAlreadyExists - Whether the new tag already exists
 * @returns Decision object with version info and whether to create release
 */
export function determineReleaseDecision(
    currentVersion: string,
    latestTag: string | null,
    tagPrefix: string,
    tagAlreadyExists: boolean,
): ReleaseDecision {
    const newTagName = buildTagName(tagPrefix, currentVersion);

    // First release - no previous tags
    if (!latestTag) {
        return {
            versionChanged: true,
            shouldCreateRelease: true,
            newTagName,
            currentVersion,
        };
    }

    const latestVersion = extractVersionFromTag(latestTag, tagPrefix);

    // Version hasn't changed
    if (currentVersion === latestVersion) {
        return {
            versionChanged: false,
            shouldCreateRelease: false,
            newTagName,
            currentVersion,
            latestVersion,
        };
    }

    // Version changed but tag already exists
    if (tagAlreadyExists) {
        return {
            versionChanged: true,
            shouldCreateRelease: false,
            newTagName,
            currentVersion,
            latestVersion,
        };
    }

    // Version changed and tag doesn't exist - create release
    return {
        versionChanged: true,
        shouldCreateRelease: true,
        newTagName,
        currentVersion,
        latestVersion,
    };
}

/**
 * Get changelog content with fallback to default message (pure function)
 * @param changelogContent - Extracted changelog content (may be empty)
 * @param version - Version number for fallback message
 * @returns Changelog content or default message
 */
export function getChangelogWithFallback(changelogContent: string, version: string): string {
    return changelogContent || `Release ${version}`;
}

/**
 * Parse inputs from GitHub Actions (pure function)
 * @returns Configuration object
 */
export function parseInputs(): ReleaseConfig {
    return {
        githubToken: core.getInput('github-token', { required: true }),
        packageJsonPath: core.getInput('package-json-path') || 'package.json',
        changelogPath: core.getInput('changelog-path') || 'CHANGELOG.md',
        tagPrefix: core.getInput('tag-prefix') || 'v',
        createDraft: core.getInput('create-draft') === 'true',
        createPrerelease: core.getInput('create-prerelease') === 'true',
    };
}

async function run(): Promise<void> {
    try {
        // Get inputs
        const config = parseInputs();

        core.info('🚀 Starting Auto Release Action...');
        core.info(`📦 Package.json path: ${config.packageJsonPath}`);
        core.info(`📝 Changelog path: ${config.changelogPath}`);
        core.info(`🏷️  Tag prefix: ${config.tagPrefix}`);

        // Get GitHub context
        const context = github.context;
        const octokit = github.getOctokit(config.githubToken);

        // Check if package.json exists
        if (!fs.existsSync(config.packageJsonPath)) {
            core.setFailed(`package.json not found at: ${config.packageJsonPath}`);
            return;
        }

        // Get current version from package.json
        const currentVersion = await getCurrentVersion(config.packageJsonPath);
        if (isBlank(currentVersion)) {
            core.setFailed('No version found in package.json');
            return;
        }

        core.info(`📌 Current version: ${currentVersion}`);

        // Get the latest version tag
        const latestTag = await getLatestVersionTag(config.tagPrefix);

        // Check if the new tag already exists
        const newTagName = buildTagName(config.tagPrefix, currentVersion);
        const tagAlreadyExists = await tagExists(newTagName);

        // Determine if we should create a release (pure business logic)
        const decision = determineReleaseDecision(currentVersion, latestTag, config.tagPrefix, tagAlreadyExists);

        // Log decision details
        if (isBlank(latestTag)) {
            core.info('🎉 No previous tags found, this will be the first release!');
        } else if (decision.latestVersion) {
            core.info(`🔖 Latest tagged version: ${decision.latestVersion}`);

            if (decision.versionChanged) {
                core.info(`✨ Version changed from ${decision.latestVersion} to ${currentVersion}`);

                if (tagAlreadyExists) {
                    core.warning(`⚠️  Tag ${newTagName} already exists. Skipping release.`);
                }
            } else {
                core.info('ℹ️  Version unchanged, no release needed.');
            }
        }

        // Set version-changed output
        core.setOutput('version-changed', decision.versionChanged.toString());
        core.setOutput('version', currentVersion);

        if (!decision.shouldCreateRelease) {
            core.setOutput('release-created', 'false');
            core.info('✅ Action completed (no release created)');
            return;
        }

        // Extract changelog for this version
        core.info(`📖 Extracting changelog for version ${currentVersion}...`);
        const rawChangelogContent = extractChangelog(config.changelogPath, currentVersion);
        const changelogContent = getChangelogWithFallback(rawChangelogContent, currentVersion);

        if (isBlank(rawChangelogContent)) {
            core.warning('No changelog content found, using default message');
        }

        // Create git tag
        core.info(`🏷️  Creating tag: ${decision.newTagName}`);
        await createGitTag(decision.newTagName, `Release ${decision.newTagName}`);

        // Create GitHub release
        core.info('🎊 Creating GitHub release...');
        const release = await octokit.rest.repos.createRelease({
            owner: context.repo.owner,
            repo: context.repo.repo,
            tag_name: decision.newTagName,
            name: decision.newTagName,
            body: changelogContent,
            draft: config.createDraft,
            prerelease: config.createPrerelease,
        });

        core.info(`✅ Release created successfully!`);
        core.info(`🔗 Release URL: ${release.data.html_url}`);

        // Set outputs
        core.setOutput('release-created', 'true');
        core.setOutput('release-id', release.data.id.toString());
        core.setOutput('release-url', release.data.html_url);
        core.setOutput('tag-name', decision.newTagName);

        core.info('🎉 Action completed successfully!');
    } catch (error) {
        // Handle errors
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed('An unknown error occurred');
        }
    }
}

run();
