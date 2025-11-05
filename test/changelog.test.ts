import { describe, it, expect } from 'vitest';
import { parseChangelogContent } from '../src/changelog';

// Tests for re-exported function to ensure backward compatibility
describe('changelog.ts re-exports', () => {
    it('should re-export parseChangelogContent', () => {
        const content = `
## [1.0.0]

Test content
        `;
        const result = parseChangelogContent(content, '1.0.0');
        expect(result).toBe('Test content');
    });
});
