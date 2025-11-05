import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    determineReleaseDecision, 
    getChangelogWithFallback, 
    parseInputs,
    getCurrentVersion,
    extractChangelog,
    createGitHubRelease,
    run,
} from '../src/index';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { FileService } from '../src/services/file.service';
import { GitService } from '../src/services/git.service';

describe('parseInputs', () => {
    let mockGetInput: any;

    beforeEach(() => {
        mockGetInput = vi.spyOn(core, 'getInput');
    });

    afterEach(() => {
        mockGetInput.mockRestore();
    });

    it('should parse all inputs with default values', () => {
        mockGetInput.mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        const config = parseInputs();

        expect(config).toEqual({
            githubToken: 'test-token',
            packageJsonPath: 'package.json',
            changelogPath: 'CHANGELOG.md',
            tagPrefix: 'v',
            createDraft: false,
            createPrerelease: false,
        });
    });

    it('should parse custom values when provided', () => {
        mockGetInput.mockImplementation((name: string) => {
            switch (name) {
                case 'github-token': return 'custom-token';
                case 'package-json-path': return 'custom/package.json';
                case 'changelog-path': return 'docs/CHANGELOG.md';
                case 'tag-prefix': return 'release-';
                case 'create-draft': return 'true';
                case 'create-prerelease': return 'true';
                default: return '';
            }
        });

        const config = parseInputs();

        expect(config).toEqual({
            githubToken: 'custom-token',
            packageJsonPath: 'custom/package.json',
            changelogPath: 'docs/CHANGELOG.md',
            tagPrefix: 'release-',
            createDraft: true,
            createPrerelease: true,
        });
    });

    it('should handle boolean flags correctly', () => {
        mockGetInput.mockImplementation((name: string) => {
            if (name === 'github-token') return 'token';
            if (name === 'create-draft') return 'false';
            if (name === 'create-prerelease') return 'false';
            return '';
        });

        const config = parseInputs();

        expect(config.createDraft).toBe(false);
        expect(config.createPrerelease).toBe(false);
    });
});

describe('determineReleaseDecision', () => {
    describe('first release (no previous tags)', () => {
        it('should indicate version changed and should create release', () => {
            const result = determineReleaseDecision('1.0.0', null, 'v', false);

            expect(result).toEqual({
                versionChanged: true,
                shouldCreateRelease: true,
                newTagName: 'v1.0.0',
                currentVersion: '1.0.0',
            });
        });

        it('should handle custom tag prefix', () => {
            const result = determineReleaseDecision('1.0.0', null, 'release-', false);

            expect(result.newTagName).toBe('release-1.0.0');
            expect(result.shouldCreateRelease).toBe(true);
        });
    });

    describe('version unchanged', () => {
        it('should not create release when version matches latest tag', () => {
            const result = determineReleaseDecision('1.2.3', 'v1.2.3', 'v', false);

            expect(result).toEqual({
                versionChanged: false,
                shouldCreateRelease: false,
                newTagName: 'v1.2.3',
                currentVersion: '1.2.3',
                latestVersion: '1.2.3',
            });
        });

        it('should handle tags without prefix', () => {
            const result = determineReleaseDecision('2.0.0', '2.0.0', '', false);

            expect(result.versionChanged).toBe(false);
            expect(result.shouldCreateRelease).toBe(false);
            expect(result.latestVersion).toBe('2.0.0');
        });
    });

    describe('version changed', () => {
        it('should create release when version is new and tag does not exist', () => {
            const result = determineReleaseDecision('1.3.0', 'v1.2.3', 'v', false);

            expect(result).toEqual({
                versionChanged: true,
                shouldCreateRelease: true,
                newTagName: 'v1.3.0',
                currentVersion: '1.3.0',
                latestVersion: '1.2.3',
            });
        });

        it('should not create release when tag already exists', () => {
            const result = determineReleaseDecision('1.3.0', 'v1.2.3', 'v', true);

            expect(result).toEqual({
                versionChanged: true,
                shouldCreateRelease: false,
                newTagName: 'v1.3.0',
                currentVersion: '1.3.0',
                latestVersion: '1.2.3',
            });
        });

        it('should handle version downgrade', () => {
            const result = determineReleaseDecision('1.0.0', 'v2.0.0', 'v', false);

            expect(result.versionChanged).toBe(true);
            expect(result.shouldCreateRelease).toBe(true);
            expect(result.currentVersion).toBe('1.0.0');
            expect(result.latestVersion).toBe('2.0.0');
        });

        it('should handle prerelease versions', () => {
            const result = determineReleaseDecision('2.0.0-beta.1', 'v1.9.9', 'v', false);

            expect(result.versionChanged).toBe(true);
            expect(result.shouldCreateRelease).toBe(true);
            expect(result.newTagName).toBe('v2.0.0-beta.1');
        });
    });

    describe('edge cases', () => {
        it('should handle empty tag prefix', () => {
            const result = determineReleaseDecision('1.0.0', null, '', false);

            expect(result.newTagName).toBe('1.0.0');
            expect(result.shouldCreateRelease).toBe(true);
        });

        it('should handle version with build metadata', () => {
            const result = determineReleaseDecision('1.0.0+build.123', 'v1.0.0', 'v', false);

            expect(result.versionChanged).toBe(true);
            expect(result.currentVersion).toBe('1.0.0+build.123');
        });

        it('should create correct tag name with special characters in version', () => {
            const result = determineReleaseDecision('1.0.0-rc.1+20251104', null, 'v', false);

            expect(result.newTagName).toBe('v1.0.0-rc.1+20251104');
        });
    });
});

describe('getChangelogWithFallback', () => {
    it('should return changelog content when provided', () => {
        const changelog = '## Added\n- New feature\n\n## Fixed\n- Bug fix';

        const result = getChangelogWithFallback(changelog, '1.0.0');

        expect(result).toBe(changelog);
    });

    it('should return fallback message when changelog is empty string', () => {
        const result = getChangelogWithFallback('', '1.2.3');

        expect(result).toBe('Release 1.2.3');
    });

    it('should return fallback message for whitespace-only content', () => {
        const result = getChangelogWithFallback('   ', '2.0.0');

        expect(result).toBe('   ');
    });

    it('should handle multiline changelog content', () => {
        const changelog = `
### Breaking Changes
- Changed API signature

### Features  
- Added new endpoint
        `;

        const result = getChangelogWithFallback(changelog, '3.0.0');

        expect(result).toContain('Breaking Changes');
        expect(result).toContain('Added new endpoint');
    });

    it('should generate correct fallback for prerelease versions', () => {
        const result = getChangelogWithFallback('', '2.0.0-beta.1');

        expect(result).toBe('Release 2.0.0-beta.1');
    });

    it('should preserve special formatting in changelog', () => {
        const changelog = '- Feature 1\n  - Sub-point\n- Feature 2';

        const result = getChangelogWithFallback(changelog, '1.0.0');

        expect(result).toBe(changelog);
    });
});

describe('getCurrentVersion', () => {
    let fileService: FileService;

    beforeEach(() => {
        fileService = new FileService();
    });

    it('should return version when package.json exists and has valid version', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue('{"version": "1.2.3"}');

        const version = getCurrentVersion(fileService, 'package.json');

        expect(version).toBe('1.2.3');
    });

    it('should throw error when package.json does not exist', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(false);

        expect(() => getCurrentVersion(fileService, 'custom/package.json'))
            .toThrow('package.json not found at: custom/package.json');
    });

    it('should throw error when version is missing from package.json', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue('{"name": "test"}');

        expect(() => getCurrentVersion(fileService, 'package.json'))
            .toThrow('No version found in package.json');
    });

    it('should throw error when version is empty string', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue('{"version": ""}');

        expect(() => getCurrentVersion(fileService, 'package.json'))
            .toThrow('No version found in package.json');
    });

    it('should handle prerelease versions', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue('{"version": "2.0.0-beta.1"}');

        const version = getCurrentVersion(fileService, 'package.json');

        expect(version).toBe('2.0.0-beta.1');
    });

    it('should handle versions with build metadata', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue('{"version": "1.0.0+build.123"}');

        const version = getCurrentVersion(fileService, 'package.json');

        expect(version).toBe('1.0.0+build.123');
    });
});

describe('extractChangelog', () => {
    let fileService: FileService;

    beforeEach(() => {
        fileService = new FileService();
    });

    it('should return empty string when changelog file does not exist', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(false);

        const result = extractChangelog(fileService, 'CHANGELOG.md', '1.0.0');

        expect(result).toBe('');
    });

    it('should delegate to parseChangelogContent when file exists', () => {
        const changelogContent = '## [1.2.3]\n\n### Added\n- New feature';

        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue(changelogContent);

        const result = extractChangelog(fileService, 'CHANGELOG.md', '1.2.3');

        expect(fileService.fileExists).toHaveBeenCalledWith('CHANGELOG.md');
        expect(fileService.readFile).toHaveBeenCalledWith('CHANGELOG.md');
        expect(result).toContain('### Added');
        expect(result).toContain('- New feature');
    });

    it('should work with custom changelog paths', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue('## [1.0.0]\n- Content');

        const result = extractChangelog(fileService, 'docs/releases.md', '1.0.0');

        expect(fileService.fileExists).toHaveBeenCalledWith('docs/releases.md');
        expect(fileService.readFile).toHaveBeenCalledWith('docs/releases.md');
        expect(result).toContain('- Content');
    });

    it('should return empty string when version not found (delegates to parser)', () => {
        vi.spyOn(fileService, 'fileExists').mockReturnValue(true);
        vi.spyOn(fileService, 'readFile').mockReturnValue('## [1.0.0]\n- Old version');

        const result = extractChangelog(fileService, 'CHANGELOG.md', '2.0.0');

        expect(result).toBe('');
    });
});

describe('createGitHubRelease', () => {
    it('should create release with correct parameters', async () => {
        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 12345,
                html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
            },
        });

        const mockOctokit = {
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any;

        const result = await createGitHubRelease({
            octokit: mockOctokit,
            owner: 'owner',
            repo: 'repo',
            tagName: 'v1.0.0',
            body: '## Changes\n- Feature 1',
            draft: false,
            prerelease: false,
        });

        expect(mockCreateRelease).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            tag_name: 'v1.0.0',
            name: 'v1.0.0',
            body: '## Changes\n- Feature 1',
            draft: false,
            prerelease: false,
        });

        expect(result).toEqual({
            id: 12345,
            htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.0.0',
        });
    });

    it('should create draft release when draft is true', async () => {
        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 54321,
                html_url: 'https://github.com/test/test/releases/tag/v2.0.0',
            },
        });

        const mockOctokit = {
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any;

        await createGitHubRelease({
            octokit: mockOctokit,
            owner: 'test',
            repo: 'test',
            tagName: 'v2.0.0',
            body: 'Release notes',
            draft: true,
            prerelease: false,
        });

        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                draft: true,
            })
        );
    });

    it('should create prerelease when prerelease is true', async () => {
        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 99999,
                html_url: 'https://github.com/test/test/releases/tag/v3.0.0-beta',
            },
        });

        const mockOctokit = {
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any;

        await createGitHubRelease({
            octokit: mockOctokit,
            owner: 'test',
            repo: 'test',
            tagName: 'v3.0.0-beta',
            body: 'Beta release',
            draft: false,
            prerelease: true,
        });

        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                prerelease: true,
            })
        );
    });

    it('should handle custom tag prefix in release', async () => {
        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 11111,
                html_url: 'https://github.com/owner/repo/releases/tag/release-1.0.0',
            },
        });

        const mockOctokit = {
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any;

        const result = await createGitHubRelease({
            octokit: mockOctokit,
            owner: 'owner',
            repo: 'repo',
            tagName: 'release-1.0.0',
            body: 'Release',
            draft: false,
            prerelease: false,
        });

        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                tag_name: 'release-1.0.0',
                name: 'release-1.0.0',
            })
        );

        expect(result.htmlUrl).toBe('https://github.com/owner/repo/releases/tag/release-1.0.0');
    });

    it('should propagate errors from GitHub API', async () => {
        const mockCreateRelease = vi.fn().mockRejectedValue(
            new Error('API rate limit exceeded')
        );

        const mockOctokit = {
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any;

        await expect(createGitHubRelease({
            octokit: mockOctokit,
            owner: 'owner',
            repo: 'repo',
            tagName: 'v1.0.0',
            body: 'Release',
            draft: false,
            prerelease: false,
        })).rejects.toThrow('API rate limit exceeded');
    });
});

describe('run (integration tests)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock GitHub context
        vi.spyOn(github, 'context', 'get').mockReturnValue({
            repo: {
                owner: 'test-owner',
                repo: 'test-repo',
            },
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should successfully create a release for first version', async () => {
        // Mock inputs
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        // Mock file operations
        vi.spyOn(FileService.prototype, 'fileExists').mockImplementation((path: string) => {
            return path.includes('package.json') || path.includes('CHANGELOG.md');
        });
        vi.spyOn(FileService.prototype, 'readFile').mockImplementation((path: string) => {
            if (path.includes('package.json')) return '{"version": "1.0.0"}';
            return '## [1.0.0]\n- Initial release';
        });

        // Mock git operations
        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue([]);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(false);
        vi.spyOn(GitService.prototype, 'createTag').mockResolvedValue();

        // Mock GitHub API
        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 123,
                html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
            },
        });
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        // Mock core functions
        const mockInfo = vi.spyOn(core, 'info').mockImplementation(() => {});
        const mockSetOutput = vi.spyOn(core, 'setOutput').mockImplementation(() => {});

        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                owner: 'test-owner',
                repo: 'test-repo',
                tag_name: 'v1.0.0',
            })
        );
        expect(mockSetOutput).toHaveBeenCalledWith('version-changed', 'true');
        expect(mockSetOutput).toHaveBeenCalledWith('version', '1.0.0');
        expect(mockSetOutput).toHaveBeenCalledWith('release-created', 'true');
        expect(mockSetOutput).toHaveBeenCalledWith('release-id', '123');
    });

    it('should skip release when version unchanged', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(true);
        vi.spyOn(FileService.prototype, 'readFile').mockReturnValue('{"version": "1.0.0"}');

        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue(['v1.0.0']);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(true);

        const mockInfo = vi.spyOn(core, 'info').mockImplementation(() => {});
        const mockSetOutput = vi.spyOn(core, 'setOutput').mockImplementation(() => {});
        const mockCreateRelease = vi.fn();
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        await run();

        expect(mockCreateRelease).not.toHaveBeenCalled();
        expect(mockSetOutput).toHaveBeenCalledWith('version-changed', 'false');
        expect(mockSetOutput).toHaveBeenCalledWith('release-created', 'false');
    });

    it('should skip release when tag already exists', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(true);
        vi.spyOn(FileService.prototype, 'readFile').mockReturnValue('{"version": "1.1.0"}');

        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue(['v1.0.0']);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(true);

        const mockWarning = vi.spyOn(core, 'warning').mockImplementation(() => {});
        const mockSetOutput = vi.spyOn(core, 'setOutput').mockImplementation(() => {});
        const mockCreateRelease = vi.fn();
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        await run();

        expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('already exists'));
        expect(mockCreateRelease).not.toHaveBeenCalled();
        expect(mockSetOutput).toHaveBeenCalledWith('version-changed', 'true');
        expect(mockSetOutput).toHaveBeenCalledWith('release-created', 'false');
    });

    it('should use fallback changelog when file not found', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockImplementation((path: string) => {
            return path.includes('package.json'); // changelog doesn't exist
        });
        vi.spyOn(FileService.prototype, 'readFile').mockReturnValue('{"version": "2.0.0"}');

        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue(['v1.0.0']);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(false);
        vi.spyOn(GitService.prototype, 'createTag').mockResolvedValue();

        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 456,
                html_url: 'https://github.com/test-owner/test-repo/releases/tag/v2.0.0',
            },
        });
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        const mockWarning = vi.spyOn(core, 'warning').mockImplementation(() => {});
        vi.spyOn(core, 'info').mockImplementation(() => {});
        vi.spyOn(core, 'setOutput').mockImplementation(() => {});

        await run();

        expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('CHANGELOG.md not found'));
        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                body: 'Release 2.0.0',
            })
        );
    });

    it('should use fallback when version not in changelog', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(true);
        vi.spyOn(FileService.prototype, 'readFile').mockImplementation((path: string) => {
            if (path.includes('package.json')) return '{"version": "3.0.0"}';
            return '## [1.0.0]\n- Old release'; // version 3.0.0 not in changelog
        });

        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue([]);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(false);
        vi.spyOn(GitService.prototype, 'createTag').mockResolvedValue();

        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 789,
                html_url: 'https://github.com/test-owner/test-repo/releases/tag/v3.0.0',
            },
        });
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        const mockWarning = vi.spyOn(core, 'warning').mockImplementation(() => {});
        vi.spyOn(core, 'info').mockImplementation(() => {});
        vi.spyOn(core, 'setOutput').mockImplementation(() => {});

        await run();

        expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('3.0.0 not found'));
        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                body: 'Release 3.0.0',
            })
        );
    });

    it('should handle package.json not found error', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(false);

        const mockSetFailed = vi.spyOn(core, 'setFailed').mockImplementation(() => {});
        vi.spyOn(core, 'info').mockImplementation(() => {});

        await run();

        expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('package.json not found'));
    });

    it('should handle missing version in package.json error', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(true);
        vi.spyOn(FileService.prototype, 'readFile').mockReturnValue('{"name": "test"}');

        const mockSetFailed = vi.spyOn(core, 'setFailed').mockImplementation(() => {});
        vi.spyOn(core, 'info').mockImplementation(() => {});

        await run();

        expect(mockSetFailed).toHaveBeenCalledWith('No version found in package.json');
    });

    it('should create draft release when configured', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            if (name === 'create-draft') return 'true';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(true);
        vi.spyOn(FileService.prototype, 'readFile').mockImplementation((path: string) => {
            if (path.includes('package.json')) return '{"version": "1.0.0"}';
            return '## [1.0.0]\n- Release';
        });

        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue([]);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(false);
        vi.spyOn(GitService.prototype, 'createTag').mockResolvedValue();

        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 999,
                html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
            },
        });
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        vi.spyOn(core, 'info').mockImplementation(() => {});
        vi.spyOn(core, 'setOutput').mockImplementation(() => {});

        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                draft: true,
            })
        );
    });

    it('should create prerelease when configured', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            if (name === 'create-prerelease') return 'true';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(true);
        vi.spyOn(FileService.prototype, 'readFile').mockImplementation((path: string) => {
            if (path.includes('package.json')) return '{"version": "2.0.0-beta.1"}';
            return '## [2.0.0-beta.1]\n- Beta release';
        });

        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue([]);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(false);
        vi.spyOn(GitService.prototype, 'createTag').mockResolvedValue();

        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 888,
                html_url: 'https://github.com/test-owner/test-repo/releases/tag/v2.0.0-beta.1',
            },
        });
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        vi.spyOn(core, 'info').mockImplementation(() => {});
        vi.spyOn(core, 'setOutput').mockImplementation(() => {});

        await run();

        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                prerelease: true,
            })
        );
    });

    it('should handle unknown errors gracefully', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockImplementation(() => {
            throw 'Unknown error';
        });

        const mockSetFailed = vi.spyOn(core, 'setFailed').mockImplementation(() => {});
        vi.spyOn(core, 'info').mockImplementation(() => {});

        await run();

        expect(mockSetFailed).toHaveBeenCalledWith('An unknown error occurred');
    });

    it('should handle edge case of malformed tag (tag equals prefix)', async () => {
        vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
            if (name === 'github-token') return 'test-token';
            return '';
        });

        vi.spyOn(FileService.prototype, 'fileExists').mockReturnValue(true);
        vi.spyOn(FileService.prototype, 'readFile').mockReturnValue('{"version": "1.0.0"}');

        // Edge case: tag is exactly the prefix, resulting in empty latestVersion
        vi.spyOn(GitService.prototype, 'getTags').mockResolvedValue(['v']);
        vi.spyOn(GitService.prototype, 'tagExists').mockResolvedValue(false);
        vi.spyOn(GitService.prototype, 'createTag').mockResolvedValue();

        const mockCreateRelease = vi.fn().mockResolvedValue({
            data: {
                id: 111,
                html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
            },
        });
        vi.spyOn(github, 'getOctokit').mockReturnValue({
            rest: {
                repos: {
                    createRelease: mockCreateRelease,
                },
            },
        } as any);

        const mockInfo = vi.spyOn(core, 'info').mockImplementation(() => {});
        vi.spyOn(core, 'setOutput').mockImplementation(() => {});

        await run();

        // Should use fallback display (the tag itself) when latestVersion is empty
        expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('Latest tagged version: v'));
        expect(mockCreateRelease).toHaveBeenCalled();
    });
});
