# npm Publishing Setup Guide

## Current Status
- ❌ npm package: "not found" - Package not yet published
- ❌ Node.js badge: "not found" - Depends on npm package

## Steps to Publish to npm

### 1. Verify Package Information
```bash
npm whoami  # Check if logged into npm
npm config list  # Verify npm configuration
```

### 2. Test Package Locally
```bash
npm pack          # Create .tgz file locally
npm publish --dry-run  # Test publish without actually publishing
```

### 3. Publish to npm
```bash
# For first publish
npm publish

# For scoped packages (if needed)
npm publish --access public
```

### 4. Verify Publication
```bash
npm view context-continue-mcp  # Check package info
npm install context-continue-mcp  # Test installation
```

## Required npm Account Setup

1. **Create npm Account**: https://www.npmjs.com/signup
2. **Login locally**: `npm login`
3. **Add to GitHub Secrets**: 
   - Go to GitHub Settings > Secrets and variables > Actions
   - Add `NPM_TOKEN` secret with npm access token

## Package Badge URLs

After publishing, these badges will work:
- **npm version**: `https://badge.fury.io/js/context-continue-mcp.svg`
- **Node.js support**: `https://img.shields.io/node/v/context-continue-mcp.svg`

## Automated Publishing

The GitHub Actions workflow will automatically publish when:
1. A new release is created on GitHub
2. All tests pass
3. `NPM_TOKEN` secret is configured

## Manual Publish Commands

```bash
# Build and test first
npm run clean
npm run build
npm run test:ci

# Publish
npm publish
```