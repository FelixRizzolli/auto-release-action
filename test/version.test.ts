import { describe, it, expect } from 'vitest';
import { parsePackageJson, parseGitTags, extractVersionFromTag } from '../src/version';

describe('parsePackageJson', () => {
    it('should extract version from valid package.json', () => {
        const content = JSON.stringify({
            name: 'test-package',
            version: '1.2.3',
            description: 'Test',
        });

        const result = parsePackageJson(content);

        expect(result).toBe('1.2.3');
    });

    it('should return empty string if version is missing', () => {
        const content = JSON.stringify({
            name: 'test-package',
            description: 'Test',
        });

        const result = parsePackageJson(content);

        expect(result).toBe('');
    });

    it('should throw error for invalid JSON', () => {
        const content = 'not valid json {';

        expect(() => parsePackageJson(content)).toThrow();
    });

    it('should handle package.json with empty version', () => {
        const content = JSON.stringify({
            name: 'test-package',
            version: '',
        });

        const result = parsePackageJson(content);

        expect(result).toBe('');
    });

    it('should extract version with prerelease tags', () => {
        const content = JSON.stringify({
            version: '2.0.0-beta.1',
        });

        const result = parsePackageJson(content);

        expect(result).toBe('2.0.0-beta.1');
    });
});

describe('parseGitTags', () => {
    it('should parse multiple tags from git output', () => {
        const output = 'v1.2.3\nv1.2.2\nv1.2.1\n';

        const result = parseGitTags(output);

        expect(result).toEqual(['v1.2.3', 'v1.2.2', 'v1.2.1']);
    });

    it('should handle single tag', () => {
        const output = 'v1.0.0\n';

        const result = parseGitTags(output);

        expect(result).toEqual(['v1.0.0']);
    });

    it('should return empty array for empty output', () => {
        const output = '';

        const result = parseGitTags(output);

        expect(result).toEqual([]);
    });

    it('should handle output with only whitespace', () => {
        const output = '   \n  \n  ';

        const result = parseGitTags(output);

        expect(result).toEqual([]);
    });

    it('should filter out empty lines', () => {
        const output = 'v1.2.3\n\nv1.2.2\n\n\nv1.2.1\n';

        const result = parseGitTags(output);

        expect(result).toEqual(['v1.2.3', 'v1.2.2', 'v1.2.1']);
    });

    it('should trim whitespace around tags', () => {
        const output = '  v1.2.3  \n  v1.2.2  \n';

        const result = parseGitTags(output);

        expect(result).toEqual(['v1.2.3', 'v1.2.2']);
    });

    it('should handle tags without prefix', () => {
        const output = '1.0.0\n0.9.0\n0.8.0\n';

        const result = parseGitTags(output);

        expect(result).toEqual(['1.0.0', '0.9.0', '0.8.0']);
    });
});

describe('extractVersionFromTag', () => {
    it('should remove "v" prefix from tag', () => {
        const result = extractVersionFromTag('v1.2.3', 'v');

        expect(result).toBe('1.2.3');
    });

    it('should handle custom tag prefix', () => {
        const result = extractVersionFromTag('release-1.2.3', 'release-');

        expect(result).toBe('1.2.3');
    });

    it('should return tag as-is if prefix does not match', () => {
        const result = extractVersionFromTag('1.2.3', 'v');

        expect(result).toBe('1.2.3');
    });

    it('should handle empty prefix', () => {
        const result = extractVersionFromTag('1.2.3', '');

        expect(result).toBe('1.2.3');
    });

    it('should handle tag that is exactly the prefix', () => {
        const result = extractVersionFromTag('v', 'v');

        expect(result).toBe('');
    });

    it('should handle prerelease versions', () => {
        const result = extractVersionFromTag('v2.0.0-beta.1', 'v');

        expect(result).toBe('2.0.0-beta.1');
    });
});
