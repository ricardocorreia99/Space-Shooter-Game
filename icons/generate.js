const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const dir = path.dirname(__filename || '.');

sizes.forEach(size => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0a0a2a"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="#0ff" stroke-width="2" opacity="0.3"/>
  <polygon points="50,15 35,70 42,60 50,72 58,60 65,70" fill="#0ff"/>
  <rect x="47" y="30" width="6" height="15" fill="#fff"/>
  <rect x="28" y="58" width="8" height="5" fill="#08f"/>
  <rect x="64" y="58" width="8" height="5" fill="#08f"/>
  <rect x="2" y="20" width="2" height="2" fill="#fff" opacity="0.7"/>
  <rect x="85" y="15" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="15" y="80" width="2" height="2" fill="#fff" opacity="0.6"/>
  <rect x="90" y="75" width="2" height="2" fill="#fff" opacity="0.4"/>
  <rect x="75" y="40" width="1.5" height="1.5" fill="#fff" opacity="0.5"/>
  <rect x="10" y="45" width="1.5" height="1.5" fill="#fff" opacity="0.6"/>
</svg>`;
    const filename = path.join(__dirname, `icon-${size}.svg`);
    fs.writeFileSync(filename, svg);
    console.log(`Created icon-${size}.svg`);
});

// Also create a simple PNG placeholder using a data URL approach
// For production, use the generate-icons.html tool in a browser
console.log('\nSVG icons created. For PNG versions:');
console.log('1. Open generate-icons.html in a browser');
console.log('2. Click "Generate Icons" and download all PNGs');
console.log('3. Place them in this icons/ folder');
console.log('\nAlternatively, the manifest can reference SVG icons directly on modern browsers.');
