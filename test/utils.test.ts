import { describe, it, expect } from 'vitest';
import { buildTagName, isBlank, replaceTabs, trimEmptyEdges } from '../src/utils';

describe('utils', () => {
    describe('buildTagName', () => {
        it('joins prefix and version', () => {
            expect(buildTagName('v', '1.2.3')).toBe('v1.2.3');
        });

        it('works with empty prefix', () => {
            expect(buildTagName('', '1.0.0')).toBe('1.0.0');
        });

        it('preserves special chars in version', () => {
            expect(buildTagName('release-', '1.0.0-beta.1')).toBe('release-1.0.0-beta.1');
        });
    });

    describe('isBlank', () => {
        it('returns true for undefined/null', () => {
            expect(isBlank(undefined)).toBe(true);
            expect(isBlank(null as unknown as string)).toBe(true);
        });

        it('returns true for empty or whitespace-only strings', () => {
            expect(isBlank('')).toBe(true);
            expect(isBlank('   ')).toBe(true);
            expect(isBlank('\n')).toBe(true);
        });

        it('returns false for non-empty strings', () => {
            expect(isBlank('a')).toBe(false);
            expect(isBlank('  a  ')).toBe(false);
        });
    });

    describe('replaceTabs', () => {
        it('replaces single tab with 4 spaces by default', () => {
            expect(replaceTabs('\tfoo')).toBe('    foo');
        });

        it('replaces multiple tabs', () => {
            expect(replaceTabs('\t\tbar')).toBe('        bar');
        });

        it('supports custom tab size', () => {
            expect(replaceTabs('\txyz', 2)).toBe('  xyz');
        });

        it('does nothing when no tabs present', () => {
            expect(replaceTabs('no-tabs')).toBe('no-tabs');
        });
    });

    describe('trimEmptyEdges', () => {
        it('removes leading and trailing blank lines', () => {
            const lines = ['', '   ', 'a', 'b', ' ', ''];
            expect(trimEmptyEdges(lines)).toEqual(['a', 'b']);
        });

        it('returns empty array when all blank', () => {
            expect(trimEmptyEdges(['', ' ', '\n'])).toEqual([]);
        });

        it('preserves inner blank lines', () => {
            const lines = ['a', '', 'b'];
            expect(trimEmptyEdges(lines)).toEqual(['a', '', 'b']);
        });
    });
});
