import { describe, it, expect } from 'vitest';
import { parsePackageJson, extractVersionFromTag } from '../../src/parsers/package-json.parser';

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
