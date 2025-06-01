# GitHub Actions Workflows

This project uses GitHub Actions for comprehensive CI/CD automation. Here's an overview of the workflows:

## 🔄 CI Workflow (`ci.yml`)

**Triggers:** Push to main/develop/feature branches, Pull Requests

### Test Matrix
- **Node.js Versions:** 18.x, 20.x, 21.x
- **Operating Systems:** Ubuntu, Windows, macOS
- **Test Coverage:** 95%+ with automated reporting

### Jobs

#### 1. **Test Job**
- Runs on all Node.js versions
- Executes full test suite with coverage
- Uploads coverage to Codecov
- Validates linting and build process

#### 2. **Build Test Job**
- Verifies successful build
- Tests CLI functionality
- Validates project initialization
- Confirms npm package integrity

#### 3. **Compatibility Test Job**
- Cross-platform testing (Ubuntu, Windows, macOS)  
- Multi-version Node.js compatibility
- Core functionality validation

## 📦 Publish Workflow (`publish.yml`)

**Triggers:** GitHub Release creation

### Process
1. Runs full test suite
2. Builds production package
3. Publishes to npm registry
4. Creates release assets
5. Attaches package to GitHub release

## 🔒 Security Workflow (`security.yml`)

**Triggers:** Weekly schedule (Mondays 9 AM UTC), Manual dispatch

### Security Checks
- npm audit for vulnerability scanning
- Dependency freshness monitoring
- License compliance verification
- CodeQL static analysis

## 📊 Status Badges

The following badges are displayed in the README:

- **CI Status:** Real-time build status
- **Coverage:** Live code coverage percentage
- **npm Version:** Current published version
- **Node.js Support:** Supported versions
- **License:** MIT license badge
- **Issues:** Open issues count
- **Stars:** GitHub stars count

## 🛠️ Configuration Files

- **`.codecov.yml`**: Coverage reporting configuration
- **`jest.config.json`**: Test framework configuration  
- **`package.json`**: Enhanced scripts for CI/CD

## 🎯 Quality Gates

All workflows enforce quality standards:

- **✅ Tests must pass** on all supported Node.js versions
- **✅ Coverage threshold** maintained at 80%+
- **✅ Build verification** ensures package integrity
- **✅ Security scanning** prevents vulnerable dependencies
- **✅ Cross-platform** compatibility validation

## 🚀 Development Workflow

1. **Feature Development:** Push to `feature/*` branches triggers CI
2. **Pull Request:** Full test matrix runs for validation
3. **Merge to Main:** Comprehensive testing and coverage reporting
4. **Release Creation:** Automated npm publishing and asset generation
5. **Security Monitoring:** Weekly automated security audits

**This CI/CD setup ensures production-ready code quality and reliable deployments! 🌟**