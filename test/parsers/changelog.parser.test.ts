import { describe, it, expect } from 'vitest';
import { parseChangelogContent } from '../../src/parsers/changelog.parser';

describe('parseChangelogContent', () => {
    it('should extract changelog for a version with brackets and date', () => {
        const content = `
# Changelog

## [1.0.0] - 2025-11-04

### Added
- New feature X

### Fixed
- Bug fix Y

## [0.9.0] - 2025-10-01

### Changed
- Something old
        `;

        const result = parseChangelogContent(content, '1.0.0');

        expect(result).toContain('### Added');
        expect(result).toContain('- New feature X');
        expect(result).toContain('### Fixed');
        expect(result).toContain('- Bug fix Y');
        expect(result).not.toContain('## [0.9.0]');
        expect(result).not.toContain('Something old');
    });

    it('should extract changelog for a version without brackets', () => {
        const content = `
# Changelog

## 2.0.0 - 2025-12-01

### Breaking
- Major change

## 1.0.0
        `;

        const result = parseChangelogContent(content, '2.0.0');

        expect(result).toContain('### Breaking');
        expect(result).toContain('- Major change');
        expect(result).not.toContain('## 1.0.0');
    });

    it('should handle version with "v" prefix', () => {
        const content = `
## [1.5.0] - 2025-11-10

Content for v1.5.0
        `;

        const result = parseChangelogContent(content, 'v1.5.0');

        expect(result).toContain('Content for v1.5.0');
    });

    it('should return empty string if version not found', () => {
        const content = `
## [1.0.0] - 2025-11-04

Some content
        `;

        const result = parseChangelogContent(content, '2.0.0');

        expect(result).toBe('');
    });

    it('should extract content until end of file if no next version', () => {
        const content = `
## [1.0.0] - 2025-11-04

### Added
- Feature 1
- Feature 2

### Fixed
- Bug 1
        `;

        const result = parseChangelogContent(content, '1.0.0');

        expect(result).toContain('### Added');
        expect(result).toContain('- Feature 1');
        expect(result).toContain('### Fixed');
        expect(result).toContain('- Bug 1');
    });

    it('should trim leading and trailing blank lines', () => {
        const content = `
## [1.0.0]


Content here


## [0.9.0]
`;

        const result = parseChangelogContent(content, '1.0.0');

        expect(result).toBe('Content here');
    });

    it('should handle empty content between versions', () => {
        const content = `
## [1.0.0]

## [0.9.0]
        `;

        const result = parseChangelogContent(content, '1.0.0');

        expect(result).toBe('');
    });

    it('should convert tabs to 4 spaces', () => {
        const content = `
## [1.0.0]

\t- Indented with tab
\t\t- Double indented
        `;

        const result = parseChangelogContent(content, '1.0.0');

        expect(result).toContain('    - Indented with tab');
        expect(result).toContain('        - Double indented');
    });

    it('should handle various version formats', () => {
        const testCases = [
            { header: '## [1.2.3] - 2025-11-04', version: '1.2.3' },
            { header: '## [1.2.3]', version: '1.2.3' },
            { header: '## 1.2.3 - 2025-11-04', version: '1.2.3' },
            { header: '## 1.2.3', version: '1.2.3' },
        ];

        testCases.forEach(({ header, version }) => {
            const content = `${header}\n\nTest content\n`;
            const result = parseChangelogContent(content, version);
            expect(result).toBe('Test content');
        });
    });

    it('should handle prerelease versions', () => {
        const content = `
## [2.0.0-beta.1] - 2025-11-05

Beta release content
        `;

        const result = parseChangelogContent(content, '2.0.0-beta.1');

        expect(result).toBe('Beta release content');
    });
});
