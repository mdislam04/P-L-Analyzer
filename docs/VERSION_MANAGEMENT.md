# Version Management Guide

## Overview

The Trading Dashboard uses **semantic versioning** (MAJOR.MINOR.PATCH) to track releases. Version information is displayed in the sidebar footer along with the deployment date.

## Semantic Versioning

The version format is: **MAJOR.MINOR.PATCH** (e.g., `1.2.3`)

- **MAJOR** version: Breaking changes or significant new features
  - Example: Complete UI redesign, architecture changes, removed features
  - Increment: `1.2.3` → `2.0.0`

- **MINOR** version: New features, enhancements (backwards compatible)
  - Example: New dashboard tab, new Excel features, UI improvements
  - Increment: `1.2.3` → `1.3.0`

- **PATCH** version: Bug fixes, minor tweaks
  - Example: Fix calculations, UI adjustments, performance improvements
  - Increment: `1.2.3` → `1.2.4`

## How to Update Version

### Before Committing Changes

1. **Determine the type of change:**
   - Single file with bug fix → PATCH
   - Single file with new feature → MINOR
   - Multiple files with new feature → MINOR
   - Breaking changes → MAJOR

2. **Update package.json:**
   ```bash
   npm version patch   # For bug fixes (1.0.0 → 1.0.1)
   npm version minor   # For new features (1.0.0 → 1.1.0)
   npm version major   # For breaking changes (1.0.0 → 2.0.0)
   ```

   Or manually edit `package.json`:
   ```json
   {
     "name": "trading-dashboard",
     "version": "1.2.3",  // ← Update this
     ...
   }
   ```

3. **Commit and push:**
   ```bash
   git add package.json
   git commit -m "Bump version to 1.2.3 - Added Excel export feature"
   git push
   ```

### During Deployment

The build script (`scripts/generate-build-info.js`) automatically:
1. Reads version from `package.json`
2. Captures deployment date/time
3. Injects into production environment file
4. Website displays: **v1.2.3** and **Dec 26, 2025**

## Version History Examples

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 26, 2024 | Initial release with core trading dashboard |
| 1.1.0 | Jan 15, 2025 | Added Dashboard V2 with enhanced charts |
| 1.2.0 | Feb 10, 2025 | Added Stock Radar feature |
| 1.2.1 | Feb 12, 2025 | Fixed P&L calculation bug |
| 2.0.0 | Mar 1, 2025 | Complete UI redesign with new architecture |

## Best Practices

1. **Update version BEFORE merging to main branch**
2. **Include version change in commit message**
3. **Keep a changelog** (consider creating CHANGELOG.md)
4. **Never skip version numbers**
5. **Don't reuse version numbers**

## Rollback

If you need to rollback to a previous version:

1. Revert to the git commit with the desired version
2. The build will automatically use that version from package.json

## Display on Website

The sidebar footer shows:
- **Version**: Large, prominent (e.g., v1.2.3)
- **Deploy Date**: Formatted date (e.g., Dec 26, 2024)
- **Environment**: Production (green) or Development (yellow)

## Notes

- Version is managed in `package.json` only
- No need to manually edit environment files
- Build script handles everything automatically during deployment
- Development environment shows version 1.0.0 and current date
