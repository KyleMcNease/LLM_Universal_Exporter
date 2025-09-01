# Contributing to Universal AI Exporter

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm 8+
- Git
- Chrome/Firefox/Edge for testing

### Development Setup
```bash
git clone <repository-url>
cd LLM_Universal_Exporter
npm install
npm run build
```

## 🌿 Branch Structure

### Main Branches
- `main` - Production-ready code
- `develop` - Integration branch for features
- `release/*` - Release preparation branches

### Feature Branches
- `feature/platform-support-*` - New platform integrations
- `feature/export-format-*` - New export formats
- `feature/ui-enhancement-*` - User interface improvements
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

## 📝 Commit Standards

### Commit Types
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code formatting (no functional changes)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes
- `perf:` - Performance improvements
- `security:` - Security-related changes

### Commit Format
```
<type>(<scope>): <description>

<body>

<footer>
```

### Examples
```bash
feat(claude): add enhanced thinking block detection
fix(export): resolve PDF generation memory leak
docs(readme): update installation instructions
refactor(detector): improve platform detection resilience
test(export): add atomic operation test coverage
```

## 🧪 Testing Requirements

### Before Submitting PR
- [ ] All JavaScript files pass syntax validation
- [ ] Manifest validation passes
- [ ] Test on Chrome, Firefox, and Edge
- [ ] Memory usage stays under limits
- [ ] No console errors in production mode
- [ ] Export success rate >95% in testing

### Test Commands
```bash
npm run validate       # Full validation
npm run test          # Run test suite
npm run test-security # Security validation
npm run lint          # Code linting
```

## 🔄 Development Workflow

### Adding New Platform Support
1. Create feature branch: `feature/platform-support-[platform]`
2. Add platform to `platform-detector.js` with versioned selectors
3. Create platform-specific extractor in `extractors/`
4. Update manifest.json host_permissions
5. Add platform to README.md
6. Test thoroughly on actual platform
7. Submit PR with test results

### Adding Export Format
1. Create feature branch: `feature/export-format-[format]`
2. Add format to `export-interface.js` formats object
3. Implement `generate[Format]()` method
4. Add MIME type and file extension mapping
5. Update UI to include new format
6. Add validation for new format
7. Test with various conversation sizes

### Bug Fixes
1. Create branch: `bugfix/[issue-description]`
2. Write failing test that reproduces bug
3. Implement fix
4. Verify test passes
5. Test on multiple platforms
6. Submit PR with before/after evidence

## 🔒 Security Guidelines

### Code Requirements
- No external API calls from content scripts
- Sanitize all user input
- Use CSP-compliant code injection
- Validate all DOM queries with error boundaries
- Clean up resources on page unload

### Privacy Requirements
- All processing must be client-side
- No telemetry or analytics without explicit user consent
- No PII logging or storage
- Anonymize any debug information

## 📦 Release Process

### Version Numbering
- Major: Breaking changes or major new features
- Minor: New features, platform support
- Patch: Bug fixes, security updates

### Release Checklist
- [ ] Update version in package.json and manifest.json
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Test on all supported browsers
- [ ] Build production package
- [ ] Create release tag
- [ ] Submit to extension stores

## 🎯 Code Quality Standards

### Architecture Principles
- Follow existing modular structure
- Implement comprehensive error boundaries
- Use resource management patterns
- Maintain atomic operation principles
- Follow memory management best practices

### Code Style
- Use consistent formatting
- Add JSDoc comments for public functions
- Follow existing naming conventions
- Implement proper error handling
- Write self-documenting code

## 💬 Getting Help

### Resources
- README.md - Setup and usage
- GitHub Issues - Bug reports and features
- GitHub Discussions - General questions
- Code comments - Implementation details

### Review Process
1. Create PR with detailed description
2. Automated checks must pass
3. Manual testing by maintainers
4. Code review and feedback
5. Approval and merge

---

Thank you for contributing to Universal AI Exporter! 🚀