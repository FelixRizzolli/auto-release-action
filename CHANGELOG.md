# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
