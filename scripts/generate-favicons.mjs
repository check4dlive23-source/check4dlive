import sharp from 'sharp';
import { readFileSync } from 'fs';

const input = 'public/icon-512.jpg';

await sharp(input).resize(32, 32).toFile('public/favicon-32x32.png');
await sharp(input).resize(16, 16).toFile('public/favicon-16x16.png');
await sharp(input).resize(180, 180).toFile('public/apple-touch-icon.png');
await sharp(input).resize(512, 512).toFile('public/android-chrome-512x512.png');
await sharp(input).resize(32, 32).toFile('src/app/icon.png');

console.log('All favicon sizes generated!');
