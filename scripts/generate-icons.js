// scripts/generate-icons.js
// Generates extension icons in various sizes using sharp (dev dep)

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Source image (place your source icon.png in icons/source-icon.png)
const sourcePath = path.join(__dirname, '../icons/source-icon.png');
const outputDir = path.join(__dirname, '../icons');

// Sizes needed (per manifest.json)
const sizes = [16, 32, 48, 128];

async function generateIcons() {
    if (!fs.existsSync(sourcePath)) {
        console.error('Source icon not found at', sourcePath);
        process.exit(1);
    }

    fs.mkdirSync(outputDir, { recursive: true });

    for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon${size}.png`);
        await sharp(sourcePath)
            .resize(size, size)
            .toFile(outputPath);
        console.log(`Generated ${outputPath}`);
    }
}

generateIcons().catch(err => {
    console.error('Icon generation failed:', err);
    process.exit(1);
});