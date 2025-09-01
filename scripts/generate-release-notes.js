// scripts/generate-release-notes.js
// Generates release notes from git logs (requires git installed)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function generateReleaseNotes() {
    try {
        // Get last tag
        const lastTag = execSync('git describe --tags --abbrev=0').toString().trim();
        
        // Get commits since last tag
        const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"- %s (%an)"`).toString().trim();
        
        const notes = `# Release Notes - v${process.env.npm_package_version}\n\n## Changes\n${commits || '- No changes since last release'}\n\nGenerated: ${new Date().toISOString()}`;
        
        const outputPath = path.join(__dirname, '../RELEASE_NOTES.md');
        fs.writeFileSync(outputPath, notes);
        console.log(`Release notes generated at ${outputPath}`);
    } catch (err) {
        console.error('Failed to generate release notes:', err);
        process.exit(1);
    }
}

generateReleaseNotes();