import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import { getCurrentVersion, getLatestVersionTag, tagExists, extractVersionFromTag, createGitTag } from './version';
import { extractChangelog } from './changelog';

interface ReleaseResult {
    created: boolean;
    releaseId?: number;
    releaseUrl?: string;
    version?: string;
    tagName?: string;
    versionChanged: boolean;
}

async function run(): Promise<void> {
    try {
        // Get inputs
        const githubToken = core.getInput('github-token', { required: true });
        const packageJsonPath = core.getInput('package-json-path') || 'package.json';
        const changelogPath = core.getInput('changelog-path') || 'CHANGELOG.md';
        const tagPrefix = core.getInput('tag-prefix') || 'v';
        const createDraft = core.getInput('create-draft') === 'true';
        const createPrerelease = core.getInput('create-prerelease') === 'true';

        core.info('🚀 Starting Auto Release Action...');
        core.info(`📦 Package.json path: ${packageJsonPath}`);
        core.info(`📝 Changelog path: ${changelogPath}`);
        core.info(`🏷️  Tag prefix: ${tagPrefix}`);

        // Get GitHub context
        const context = github.context;
        const octokit = github.getOctokit(githubToken);

        // Check if package.json exists
        if (!fs.existsSync(packageJsonPath)) {
            core.setFailed(`package.json not found at: ${packageJsonPath}`);
            return;
        }

        // Get current version from package.json
        const currentVersion = await getCurrentVersion(packageJsonPath);
        if (!currentVersion) {
            core.setFailed('No version found in package.json');
            return;
        }

        core.info(`📌 Current version: ${currentVersion}`);

        // Get the latest version tag
        const latestTag = await getLatestVersionTag(tagPrefix);

        let versionChanged = false;
        let shouldCreateRelease = false;
        const newTagName = `${tagPrefix}${currentVersion}`;

        if (!latestTag) {
            core.info('🎉 No previous tags found, this will be the first release!');
            versionChanged = true;
            shouldCreateRelease = true;
        } else {
            const latestVersion = extractVersionFromTag(latestTag, tagPrefix);
            core.info(`🔖 Latest tagged version: ${latestVersion}`);

            if (currentVersion !== latestVersion) {
                core.info(`✨ Version changed from ${latestVersion} to ${currentVersion}`);
                versionChanged = true;

                // Check if tag already exists
                const exists = await tagExists(newTagName);
                if (exists) {
                    core.warning(`⚠️  Tag ${newTagName} already exists. Skipping release.`);
                    shouldCreateRelease = false;
                } else {
                    shouldCreateRelease = true;
                }
            } else {
                core.info('ℹ️  Version unchanged, no release needed.');
            }
        }

        // Set version-changed output
        core.setOutput('version-changed', versionChanged.toString());
        core.setOutput('version', currentVersion);

        if (!shouldCreateRelease) {
            core.setOutput('release-created', 'false');
            core.info('✅ Action completed (no release created)');
            return;
        }

        // Extract changelog for this version
        core.info(`📖 Extracting changelog for version ${currentVersion}...`);
        let changelogContent = extractChangelog(changelogPath, currentVersion);

        if (!changelogContent) {
            changelogContent = `Release ${currentVersion}`;
            core.warning('No changelog content found, using default message');
        }

        // Create git tag
        core.info(`🏷️  Creating tag: ${newTagName}`);
        await createGitTag(newTagName, `Release ${newTagName}`);

        // Create GitHub release
        core.info('🎊 Creating GitHub release...');
        const release = await octokit.rest.repos.createRelease({
            owner: context.repo.owner,
            repo: context.repo.repo,
            tag_name: newTagName,
            name: newTagName,
            body: changelogContent,
            draft: createDraft,
            prerelease: createPrerelease,
        });

        core.info(`✅ Release created successfully!`);
        core.info(`🔗 Release URL: ${release.data.html_url}`);

        // Set outputs
        core.setOutput('release-created', 'true');
        core.setOutput('release-id', release.data.id.toString());
        core.setOutput('release-url', release.data.html_url);
        core.setOutput('tag-name', newTagName);

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
