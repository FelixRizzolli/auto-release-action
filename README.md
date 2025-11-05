# Auto Release Action

A compact GitHub Action that creates releases automatically when your `package.json` version changes.

Clear, fast, and focused — designed for repos that use [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and `CHANGELOG.md` file with a format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Quick start

1. Add a workflow file like `.github/workflows/release.yml`.
2. Ensure the checkout step fetches tags (important): `fetch-depth: 0`.
3. Use the action and provide a GitHub token:

```yaml
name: Release
on:
    push:
        branches: [ main ]
        paths: [ 'package.json', 'CHANGELOG.md' ]
    workflow_dispatch:

permissions:
    contents: write

jobs:
    release:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
                with:
                    fetch-depth: 0

            - name: Create Release
                uses: FelixRizzolli/auto-release-action@v1
                with:
                    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Name | Description | Required | Default |
|------|-------------|:--------:|:-------:|
| `github-token` | GitHub token with `contents: write` permission | Yes | `${{ github.token }}` |
| `package-json-path` | Path to package.json | No | `package.json` |
| `changelog-path` | Path to CHANGELOG.md | No | `CHANGELOG.md` |
| `tag-prefix` | Tag name prefix (e.g. `v`) | No | `v` |
| `create-draft` | Create release as draft | No | `false` |
| `create-prerelease` | Mark release as prerelease | No | `false` |

## Outputs

| Name | Description |
|------|-------------|
| `release-created` | `true` if a release was created |
| `release-id` | The GitHub release ID |
| `release-url` | URL of the created release |
| `version` | Version used for the release |
| `tag-name` | Created tag name |
| `version-changed` | `true` if version changed from last tag |

## Behavior

- Reads the version from `package.json`.
- Compares it to the latest tag in the repository.
- If the version changed, extracts the matching section from `CHANGELOG.md` (expects level-2 headers `##`) and creates a tag + GitHub release using that changelog content.
- Falls back to a default message if no matching changelog section is found.

Recommended formats for changelog headers:

- `## [1.2.3] - 2025-11-04`
- `## 1.2.3 - 2025-11-04`
- `## [1.2.3]`

## Development

Build and test locally:

```bash
pnpm install
pnpm run build
pnpm test
```

Notes:
- The compiled action is produced in `dist/` and should be committed for use in workflows that reference the repo directly.
- Tests use Vitest and coverage is produced with V8 (`@vitest/coverage-v8`).

## Contributing

Contributions welcome — please open issues or pull requests. Keep changes focused and include tests for new behavior.
