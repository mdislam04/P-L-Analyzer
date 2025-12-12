/**
 * Favicon Generator Script
 * 
 * Generates PNG and ICO favicon files from SVG sources
 * 
 * Usage:
 *   1. Install dependencies: npm install sharp svg2img ico-endec
 *   2. Run: node generate-favicons.js
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Trading Dashboard Favicon Generator\n');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('❌ Error: sharp is not installed');
  console.log('📦 Install with: npm install sharp');
  console.log('\nAlternatively, use online tools mentioned in public/README.md');
  process.exit(1);
}

const publicDir = __dirname;

async function generateFavicons() {
  try {
    console.log('📁 Working directory:', publicDir);
    console.log('');

    // Generate 32x32 PNG from SVG
    console.log('🔧 Generating favicon-32x32.png...');
    await sharp(path.join(publicDir, 'favicon.svg'))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✅ Created favicon-32x32.png');

    // Generate 180x180 PNG for Apple Touch Icon
    console.log('🔧 Generating apple-touch-icon.png...');
    await sharp(path.join(publicDir, 'apple-touch-icon.svg'))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ Created apple-touch-icon.png');

    // Generate 192x192 for Android
    console.log('🔧 Generating android-chrome-192x192.png...');
    await sharp(path.join(publicDir, 'apple-touch-icon.svg'))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'android-chrome-192x192.png'));
    console.log('✅ Created android-chrome-192x192.png');

    // Generate 512x512 for Android
    console.log('🔧 Generating android-chrome-512x512.png...');
    await sharp(path.join(publicDir, 'apple-touch-icon.svg'))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'android-chrome-512x512.png'));
    console.log('✅ Created android-chrome-512x512.png');

    console.log('\n✨ All PNG favicons generated successfully!');
    console.log('\n📝 Note: For .ico file generation, use an online tool like:');
    console.log('   - https://www.favicon-generator.org/');
    console.log('   - https://realfavicongenerator.net/');
    console.log('\n   Or install ImageMagick and run:');
    console.log('   convert favicon-32x32.png -define icon:auto-resize=16,32,48 favicon.ico');

  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    process.exit(1);
  }
}

generateFavicons();
