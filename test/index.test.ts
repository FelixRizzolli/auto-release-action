import { describe, it, expect } from 'vitest';
import { determineReleaseDecision, getChangelogWithFallback } from '../src/index';

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
