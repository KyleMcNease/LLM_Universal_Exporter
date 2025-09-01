// scripts/validate-manifest.js
// Validates manifest.json schema (basic JSON check + required fields)

const fs = require('fs');
const path = require('path');

function validateManifest() {
    const manifestPath = path.join(__dirname, '../manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Basic schema check (Manifest V3 required fields)
    const requiredFields = [
        'manifest_version',
        'name',
        'version',
        'description',
        'permissions',
        'host_permissions',
        'background',
        'content_scripts',
        'action',
        'icons'
    ];

    requiredFields.forEach(field => {
        if (!manifest[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    });

    // Specific checks
    if (manifest.manifest_version !== 3) {
        throw new Error('Manifest version must be 3');
    }

    if (!Array.isArray(manifest.host_permissions) || manifest.host_permissions.length === 0) {
        throw new Error('host_permissions must be a non-empty array');
    }

    console.log('Manifest validation passed!');
}

validateManifest();