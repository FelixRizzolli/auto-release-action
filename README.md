# Auto Release Action

This README documents the recommended usage and expectations for the complementary "auto release" action (create releases when `package.json` version changes). It borrows the clearer layout used in `README.md` and focuses on quick start, inputs/outputs, and recommended changelog formats.

## What it does

- Reads `version` from `package.json`.
- Compares to the latest tag.
- If changed, extracts the matching section from `CHANGELOG.md` (expects `##` headers) and creates a tag and GitHub release using that changelog content.
- Falls back to a default release body when no matching changelog section is found.

## Quick start

Minimal workflow example (ensure `fetch-depth: 0` so tags are available):

```yaml
name: Release
on:
    push:
        branches: [ main ]
        paths: [ 'package.json', 'CHANGELOG.md' ]
    workflow_dispatch: {}

permissions:
    contents: write

jobs:
    release:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v5
                with:
                    fetch-depth: 0

            - name: Create Release
                uses: FelixRizzolli/auto-release-action@v1
                with:
                    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Name | Required | Default | Description |
|------|:--------:|:-------:|-------------|
| `github-token` | Yes | `${{ github.token }}` | GitHub token with `contents: write` permission |
| `package-json-path` | No | `package.json` | Path to `package.json` |
| `changelog-path` | No | `CHANGELOG.md` | Path to `CHANGELOG.md` |
| `tag-prefix` | No | `v` | Prefix to use when creating tags |
| `create-draft` | No | `false` | Create the release as a draft |
| `create-prerelease` | No | `false` | Mark release as prerelease |

## Outputs

| Name | Description |
|------|-------------|
| `release-created` | `true` if a release was created |
| `release-id` | GitHub release ID |
| `release-url` | URL of the created release |
| `version` | Version used for release |
| `tag-name` | Created tag name |
| `version-changed` | `true` if version changed from last tag |

## Recommended changelog header formats

- `## [1.2.3] - 2025-11-04`
- `## 1.2.3 - 2025-11-04`
- `## [1.2.3]`

Using these patterns improves the action's ability to reliably extract the correct changelog section.

## Development

Build and test locally:

```bash
pnpm install
pnpm build
pnpm test
```

Notes:

- The compiled action is produced in `dist/` and should be committed for use in workflows that reference the repo directly (for `uses: ./`).
- Tests use Vitest and coverage with `@vitest/coverage-v8`.

## Contributing

Contributions welcome — please open issues or pull requests. Keep changes focused and include tests for new behavior.

## Maintainer

Felix Rizzolli — https://github.com/FelixRizzolli
