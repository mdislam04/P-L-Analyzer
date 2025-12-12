# Favicon Assets

This folder contains the favicon assets for the Trading Dashboard application.

## Files

- **favicon.svg** - Modern SVG favicon (automatically used by modern browsers)
- **apple-touch-icon.svg** - SVG for Apple devices (180x180)
- **favicon.ico** - Legacy ICO format for older browsers

## Icon Design

The favicon features:
- **Chart bars** in red (loss), yellow (neutral), and green (profit) representing trading performance
- **Trend line** in blue showing upward trajectory
- **₹ symbol** in gold representing Indian Rupee currency
- **Dark gradient background** matching the app theme (#1a2332 → #0f1419)

## Generating PNG versions (Optional)

If you need PNG versions for better browser compatibility, you can generate them using online tools or Node.js:

### Option 1: Online Tools
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `favicon.svg` and convert to 32x32 PNG
3. Upload `apple-touch-icon.svg` and convert to 180x180 PNG
4. Save as `favicon-32x32.png` and `apple-touch-icon.png`

### Option 2: Using sharp (Node.js)
```bash
npm install sharp-cli -g
sharp -i favicon.svg -o favicon-32x32.png resize 32 32
sharp -i apple-touch-icon.svg -o apple-touch-icon.png resize 180 180
```

### Option 3: Using ImageMagick
```bash
convert -background none -resize 32x32 favicon.svg favicon-32x32.png
convert -background none -resize 180x180 apple-touch-icon.svg apple-touch-icon.png
```

## Generating ICO file

To generate a multi-resolution .ico file:

### Using online tool:
1. Go to https://www.favicon-generator.org/
2. Upload `favicon.svg`
3. Download the generated favicon.ico
4. Replace the existing favicon.ico

### Using ImageMagick:
```bash
convert favicon.svg -define icon:auto-resize=256,128,64,48,32,16 favicon.ico
```

## Browser Support

- **Modern browsers** (Chrome, Firefox, Safari, Edge): Use SVG automatically
- **iOS/Android**: Use apple-touch-icon.svg
- **Legacy browsers**: Fall back to favicon.ico

The current setup prioritizes SVG (scalable, crisp at any size) with ICO fallback.
