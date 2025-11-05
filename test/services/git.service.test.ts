import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitService } from '../../src/services/git.service';
import * as actionsExec from '@actions/exec';
import * as core from '@actions/core';

// Mock the @actions/exec module
vi.mock('@actions/exec');
vi.mock('@actions/core');

describe('GitService', () => {
    let gitService: GitService;
    let mockExec: any;
    let mockWarning: any;
    let mockInfo: any;

    beforeEach(() => {
        gitService = new GitService();
        mockExec = vi.mocked(actionsExec.exec);
        mockWarning = vi.mocked(core.warning);
        mockInfo = vi.mocked(core.info);
        vi.clearAllMocks();
    });

    describe('getTags', () => {
        it('should return array of tags when git command succeeds', async () => {
            mockExec.mockImplementation(async (_command: string, _args: string[], options: any) => {
                options.listeners.stdout(Buffer.from('v1.2.3\nv1.2.2\nv1.2.1\n'));
                return 0;
            });

            const result = await gitService.getTags('v');

            expect(result).toEqual(['v1.2.3', 'v1.2.2', 'v1.2.1']);
            expect(mockExec).toHaveBeenCalledWith(
                'git',
                ['tag', '-l', 'v*', '--sort=-v:refname'],
                expect.any(Object)
            );
        });

        it('should return empty array when no tags found', async () => {
            mockExec.mockImplementation(async (_command: string, _args: string[], options: any) => {
                options.listeners.stdout(Buffer.from(''));
                return 0;
            });

            const result = await gitService.getTags('v');

            expect(result).toEqual([]);
        });

        it('should return empty array and log warning when git command fails', async () => {
            mockExec.mockImplementation(async (_command: string, _args: string[], options: any) => {
                options.listeners.stderr(Buffer.from('git error message'));
                return 1;
            });

            const result = await gitService.getTags('v');

            expect(result).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith('git tag command failed: git error message');
        });

        it('should filter out empty lines and trim whitespace', async () => {
            mockExec.mockImplementation(async (_command: string, _args: string[], options: any) => {
                options.listeners.stdout(Buffer.from('  v1.2.3  \n\nv1.2.2\n\n'));
                return 0;
            });

            const result = await gitService.getTags('v');

            expect(result).toEqual(['v1.2.3', 'v1.2.2']);
        });
    });

    describe('tagExists', () => {
        it('should return true when tag exists', async () => {
            mockExec.mockResolvedValue(0);

            const result = await gitService.tagExists('v1.0.0');

            expect(result).toBe(true);
            expect(mockExec).toHaveBeenCalledWith(
                'git',
                ['rev-parse', 'v1.0.0'],
                expect.any(Object)
            );
        });

        it('should return false when tag does not exist', async () => {
            mockExec.mockResolvedValue(1);

            const result = await gitService.tagExists('v999.0.0');

            expect(result).toBe(false);
        });
    });

    describe('createTag', () => {
        it('should configure git, create tag, and push', async () => {
            mockExec.mockResolvedValue(0);

            await gitService.createTag('v1.0.0', 'Release v1.0.0');

            expect(mockExec).toHaveBeenCalledTimes(4);
            expect(mockExec).toHaveBeenNthCalledWith(1, 'git', ['config', 'user.name', 'github-actions[bot]']);
            expect(mockExec).toHaveBeenNthCalledWith(2, 'git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
            expect(mockExec).toHaveBeenNthCalledWith(3, 'git', ['tag', '-a', 'v1.0.0', '-m', 'Release v1.0.0']);
            expect(mockExec).toHaveBeenNthCalledWith(4, 'git', ['push', 'origin', 'v1.0.0']);
            expect(mockInfo).toHaveBeenCalledWith('Created and pushed tag: v1.0.0');
        });
    });

    describe('getFileFromTag', () => {
        it('should return file content when git show succeeds', async () => {
            const packageContent = '{"name":"test","version":"1.0.0"}';
            mockExec.mockImplementation(async (_command: string, _args: string[], options: any) => {
                options.listeners.stdout(Buffer.from(packageContent));
                return 0;
            });

            const result = await gitService.getFileFromTag('v1.0.0', 'package.json');

            expect(result).toBe(packageContent);
            expect(mockExec).toHaveBeenCalledWith(
                'git',
                ['show', 'v1.0.0:package.json'],
                expect.any(Object)
            );
        });

        it('should throw error when git show fails', async () => {
            mockExec.mockImplementation(async (_command: string, _args: string[], options: any) => {
                options.listeners.stderr(Buffer.from('fatal: Path does not exist'));
                return 1;
            });

            await expect(
                gitService.getFileFromTag('v1.0.0', 'package.json')
            ).rejects.toThrow('Failed to get package.json from tag v1.0.0');
        });
    });
});
