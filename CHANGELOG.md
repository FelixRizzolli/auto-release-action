# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-11-05

### Fixed

- Restored the action runtime bundle by removing `dist/` from `.gitignore` and updating the release workflow to build and commit the generated `dist/` directory on release. Without the built `dist/` the action's runtime entrypoint was missing and consumers referencing a tag failed to run the action.

## [1.1.0] - 2025-11-05

### Added

- Switched code formatter from Prettier to `oxfmt` and added a configuration file (`.oxfmtrc.json`). New npm scripts: `format`, `format:check`.
- Added `oxlint` for linting and a `lint` script (devDependency: `oxlint`).
- Introduced Vitest for testing with a `vitest.config.ts` and coverage via the V8 provider. New npm scripts: `test`, `test:watch`, `test:coverage`.
- Refactored the codebase for improved structure and testability; added comprehensive unit tests covering the project.
- Test coverage reports are included (coverage artifacts added) and tests currently report 100% coverage for the instrumented files.

### Changed

- `package.json` updated with new devDependencies and scripts (oxfmt, oxlint, vitest, @vitest/coverage-v8).
- Development environment (`.devcontainer`) updated to reference oxfmt/oxlint and Vitest tooling.

## [1.0.0] - 2025-11-04

### Initial Release

GitHub Action for automated release management based on package.json version changes.

**Core Features:**

-   Detects version changes in package.json and automatically creates GitHub releases
-   Extracts changelog content for the specific version from CHANGELOG.md
-   Creates Git tags with configurable prefix (default: "v")
-   Fully configurable paths for package.json and CHANGELOG.md
-   Supports draft and prerelease options
-   Provides rich outputs (release URL, ID, version, tag name) for workflow integration

**Technical:**

-   Written in TypeScript for type safety and maintainability
-   Bundles all dependencies into a single distributable file
-   Uses @actions/core, @actions/github, and @actions/exec for GitHub Actions integration
