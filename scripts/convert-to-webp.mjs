// scripts/convert-to-webp.mjs
// Run with: node scripts/convert-to-webp.mjs
import sharp from 'sharp';
import { readdirSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const imagesDir = join(process.cwd(), 'public', 'images');

const pngFiles = readdirSync(imagesDir).filter(f => extname(f).toLowerCase() === '.png');

console.log(`Found ${pngFiles.length} PNG files. Converting to WebP...`);

for (const file of pngFiles) {
  const input = join(imagesDir, file);
  const output = join(imagesDir, basename(file, '.png') + '.webp');

  if (existsSync(output)) {
    console.log(`  ✓ Already exists: ${basename(output)}`);
    continue;
  }

  try {
    const info = await sharp(input)
      .webp({ quality: 82, effort: 4 })
      .toFile(output);
    const inputSize = (await sharp(input).metadata()).size;
    const ratio = Math.round((1 - info.size / inputSize) * 100);
    console.log(`  ✓ ${file} → ${basename(output)} (${info.size ? Math.round(info.size/1024) : '?'}KB, saved ~${ratio}%)`);
  } catch (err) {
    console.error(`  ✗ Failed: ${file}`, err.message);
  }
}

console.log('\nDone! Now update all .png → .webp references in your source files.');
