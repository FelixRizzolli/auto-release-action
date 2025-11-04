# Auto Release Action

A GitHub Action that automatically creates releases based on `package.json` version changes and `CHANGELOG.md` content.

## Features

-   ✅ Automatically detects version changes in `package.json`
-   📝 Extracts changelog content for the specific version
-   🏷️ Creates Git tags with customizable prefix
-   🎊 Creates GitHub releases with formatted release notes
-   📦 Compares and displays dependency changes between versions
-   🔧 Fully configurable paths and options
-   🚀 Written in TypeScript for type safety

## Usage

### Basic Example

Create a workflow file (e.g., `.github/workflows/release.yml`):

```yaml
name: Auto Release

on:
    push:
        branches:
            - main
        paths:
            - 'package.json'
            - 'CHANGELOG.md'
    workflow_dispatch:

permissions:
    contents: write

jobs:
    release:
        runs-on: ubuntu-latest
        steps:
            - name: Checkout code
              uses: actions/checkout@v4
              with:
                  fetch-depth: 0 # Important: fetch all history for tags

            - name: Create Release
              uses: FelixRizzolli/auto-release-action@v1
              with:
                  github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

```yaml
- name: Create Release
  uses: FelixRizzolli/auto-release-action@v1
  with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      package-json-path: 'package.json'
      changelog-path: 'CHANGELOG.md'
      tag-prefix: 'v'
      create-draft: false
      create-prerelease: false
```

### With Outputs

```yaml
- name: Create Release
  id: release
  uses: FelixRizzolli/auto-release-action@v1
  with:
      github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Display Release Info
  if: steps.release.outputs.release-created == 'true'
  run: |
      echo "Release created: ${{ steps.release.outputs.release-url }}"
      echo "Version: ${{ steps.release.outputs.version }}"
      echo "Tag: ${{ steps.release.outputs.tag-name }}"
```

## Inputs

| Input               | Description                                                          | Required | Default               |
| ------------------- | -------------------------------------------------------------------- | -------- | --------------------- |
| `github-token`      | GitHub token for authentication (needs `contents: write` permission) | Yes      | `${{ github.token }}` |
| `package-json-path` | Path to package.json file (relative to repository root)              | No       | `package.json`        |
| `changelog-path`    | Path to CHANGELOG.md file (relative to repository root)              | No       | `CHANGELOG.md`        |
| `tag-prefix`        | Prefix for version tags (e.g., "v" for v1.0.0)                       | No       | `v`                   |
| `create-draft`      | Create release as draft                                              | No       | `false`               |
| `create-prerelease` | Mark release as prerelease                                           | No       | `false`               |

## Outputs

| Output            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `release-created` | Whether a release was created (`true`/`false`)       |
| `release-id`      | The ID of the created release                        |
| `release-url`     | The URL of the created release                       |
| `version`         | The version number of the release                    |
| `tag-name`        | The tag name created                                 |
| `version-changed` | Whether the version changed compared to the last tag |

## CHANGELOG.md Format

The action expects your `CHANGELOG.md` to follow this format:

```markdown
# Changelog

## [1.0.0] - 2024-01-15

### Added

-   New feature A
-   New feature B

### Fixed

-   Bug fix C

## [0.9.0] - 2024-01-01

### Added

-   Initial release
```

The action will extract the content for the matching version and use it as the release body.

## How It Works

1. **Version Detection**: Reads the version from `package.json`
2. **Tag Comparison**: Compares with the latest Git tag to detect version changes
3. **Changelog Extraction**: Extracts the relevant section from `CHANGELOG.md`
4. **Dependency Comparison**: Compares dependencies with the previous version and adds a summary
5. **Release Creation**: Creates a Git tag and GitHub release with the combined information

## Requirements

-   Node.js 24 runtime (automatically handled by GitHub Actions)
-   Repository must have `fetch-depth: 0` in checkout step to access all tags
-   Workflow needs `contents: write` permission

## Migration from Old Workflow

If you're migrating from a workflow with shell scripts, this action replaces:

-   `scripts/get-current-version.sh` → Built-in version detection
-   `scripts/extract-changelog.sh` → Built-in changelog extraction
-   `scripts/compare-package-json.cjs` → Built-in dependency comparison
-   Manual tag creation and release steps → Automated in one step

Simply replace your old workflow with the basic example above!

## Development

### Building

```bash
pnpm install
pnpm run build
```

The compiled action is in the `dist/` folder and must be committed.

### Project Structure

```
src/
  ├── index.ts           # Main action entry point
  ├── version.ts         # Version detection and Git operations
  ├── changelog.ts       # Changelog extraction
  └── package-compare.ts # Dependency comparison
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
