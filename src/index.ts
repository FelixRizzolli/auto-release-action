import * as core from '@actions/core';
import * as github from '@actions/github';
import { parsePackageJson, extractVersionFromTag } from './parsers/package-json.parser';
import { parseChangelogContent } from './parsers/changelog.parser';
import { buildTagName, isBlank } from './utils';
import { GitService } from './services/git.service';
import { FileService } from './services/file.service';

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

/**
 * Read and parse the current version from package.json
 * @param fileService - File service instance
 * @param packageJsonPath - Path to package.json
 * @returns Current version string
 * @throws Error if package.json doesn't exist or version is missing
 */
export function getCurrentVersion(fileService: FileService, packageJsonPath: string): string {
    if (!fileService.fileExists(packageJsonPath)) {
        throw new Error(`package.json not found at: ${packageJsonPath}`);
    }

    const packageContent = fileService.readFile(packageJsonPath);
    const currentVersion = parsePackageJson(packageContent);
    
    if (isBlank(currentVersion)) {
        throw new Error('No version found in package.json');
    }

    return currentVersion;
}

/**
 * Extract changelog content for a specific version
 * @param fileService - File service instance
 * @param changelogPath - Path to changelog file
 * @param version - Version to extract changelog for
 * @returns Changelog content (may be empty string if not found)
 */
export function extractChangelog(
    fileService: FileService,
    changelogPath: string,
    version: string
): string {
    if (!fileService.fileExists(changelogPath)) {
        return '';
    }

    const changelogFileContent = fileService.readFile(changelogPath);
    return parseChangelogContent(changelogFileContent, version);
}

/**
 * Parameters for creating a GitHub release
 */
export interface CreateReleaseParams {
    octokit: ReturnType<typeof github.getOctokit>;
    owner: string;
    repo: string;
    tagName: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
}

/**
 * Result of creating a GitHub release
 */
export interface CreateReleaseResult {
    id: number;
    htmlUrl: string;
}

/**
 * Create a GitHub release
 * @param params - Release parameters
 * @returns Release result with id and URL
 */
export async function createGitHubRelease(params: CreateReleaseParams): Promise<CreateReleaseResult> {
    const release = await params.octokit.rest.repos.createRelease({
        owner: params.owner,
        repo: params.repo,
        tag_name: params.tagName,
        name: params.tagName,
        body: params.body,
        draft: params.draft,
        prerelease: params.prerelease,
    });

    return {
        id: release.data.id,
        htmlUrl: release.data.html_url,
    };
}

export async function run(): Promise<void> {
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

        // Initialize services
        const gitService = new GitService();
        const fileService = new FileService();

        // Get current version from package.json
        const currentVersion = getCurrentVersion(fileService, config.packageJsonPath);
        core.info(`📌 Current version: ${currentVersion}`);

        // Get the latest version tag
        const tags = await gitService.getTags(config.tagPrefix);
        const latestTag = tags.length > 0 ? tags[0] : null;

        // Check if the new tag already exists
        const newTagName = buildTagName(config.tagPrefix, currentVersion);
        const tagAlreadyExists = await gitService.tagExists(newTagName);

        // Determine if we should create a release (pure business logic)
        const decision = determineReleaseDecision(currentVersion, latestTag, config.tagPrefix, tagAlreadyExists);

        // Log decision details
        if (isBlank(latestTag)) {
            core.info('🎉 No previous tags found, this will be the first release!');
        } else {
            // Always true in practice, but guard against edge cases
            const latestVersionDisplay = decision.latestVersion || latestTag;
            core.info(`🔖 Latest tagged version: ${latestVersionDisplay}`);

            if (decision.versionChanged) {
                core.info(`✨ Version changed from ${latestVersionDisplay} to ${currentVersion}`);

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

        const rawChangelogContent = extractChangelog(fileService, config.changelogPath, currentVersion);

        if (isBlank(rawChangelogContent)) {
            if (fileService.fileExists(config.changelogPath)) {
                const versionClean = currentVersion.replace(/^v/, '');
                core.warning(`Version ${versionClean} not found in ${config.changelogPath}`);
            } else {
                core.warning(`CHANGELOG.md not found at ${config.changelogPath}`);
            }
            core.warning('No changelog content found, using default message');
        }

        const changelogContent = getChangelogWithFallback(rawChangelogContent, currentVersion);

        // Create git tag
        core.info(`🏷️  Creating tag: ${decision.newTagName}`);
        await gitService.createTag(decision.newTagName, `Release ${decision.newTagName}`);

        // Create GitHub release
        core.info('🎊 Creating GitHub release...');
        const releaseResult = await createGitHubRelease({
            octokit,
            owner: context.repo.owner,
            repo: context.repo.repo,
            tagName: decision.newTagName,
            body: changelogContent,
            draft: config.createDraft,
            prerelease: config.createPrerelease,
        });

        core.info(`✅ Release created successfully!`);
        core.info(`🔗 Release URL: ${releaseResult.htmlUrl}`);

        // Set outputs
        core.setOutput('release-created', 'true');
        core.setOutput('release-id', releaseResult.id.toString());
        core.setOutput('release-url', releaseResult.htmlUrl);
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
