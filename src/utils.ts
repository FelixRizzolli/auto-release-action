export function buildTagName(prefix: string, version: string): string {
    return `${prefix}${version}`;
}

export function isBlank(value: string | undefined | null): boolean {
    return !value || value.trim().length === 0;
}

export function replaceTabs(line: string, tabSize = 4): string {
    const spaces = ' '.repeat(tabSize);
    return line.replace(/\t/g, spaces);
}

export function trimEmptyEdges(lines: string[]): string[] {
    const result = [...lines];
    while (result.length > 0 && isBlank(result[0])) {
        result.shift();
    }
    while (result.length > 0 && isBlank(result[result.length - 1])) {
        result.pop();
    }
    return result;
}
