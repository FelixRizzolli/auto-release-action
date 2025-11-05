import { describe, it, expect } from 'vitest';
import { parsePackageJson, extractVersionFromTag } from '../src/version';

// Tests for re-exported functions to ensure backward compatibility
describe('version.ts re-exports', () => {
    it('should re-export parsePackageJson', () => {
        const content = JSON.stringify({ version: '1.0.0' });
        expect(parsePackageJson(content)).toBe('1.0.0');
    });

    it('should re-export extractVersionFromTag', () => {
        expect(extractVersionFromTag('v1.0.0', 'v')).toBe('1.0.0');
    });
});

